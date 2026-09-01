import { NextResponse } from 'next/server';
import {
  DEAD_ADDRESS,
  ODYS_CREATOR,
  ODYS_POOL,
  ODYS_START_BLOCK,
  ODYS_TOKEN,
  auditedDaily,
  fallbackLive,
  type BurnEvent,
  type DailyPoint,
  type LiveAnalytics,
  type MarketRow,
} from '../../../lib/analytics-data';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const RPC_URL = 'https://arb1.arbitrum.io/rpc';
const ODYS_API = 'https://api.odys.fun';
const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const SWAP_V3_TOPIC =
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

type RpcLog = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
};
type Receipt = { logs?: RpcLog[] };

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC ${response.status}`);
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error || payload.result === undefined) {
    throw new Error(payload.error?.message ?? `RPC ${method} failed`);
  }
  return payload.result;
}

async function rpcBatch<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<T[]> {
  if (!calls.length) return [];
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(
      calls.map((call, id) => ({ jsonrpc: '2.0', id, method: call.method, params: call.params })),
    ),
  });
  if (!response.ok) throw new Error(`RPC batch ${response.status}`);
  const payload = (await response.json()) as Array<{ id: number; result?: T }>;
  return payload.sort((a, b) => a.id - b.id).map((item) => item.result as T);
}

const topicAddress = (address: string) => `0x${address.toLowerCase().slice(2).padStart(64, '0')}`;
const addressFromTopic = (topic: string) => `0x${topic.slice(-40)}`;
const hexToToken = (hex: string) => Number(BigInt(hex)) / 1e18;

async function loadBurnData() {
  const [totalSupplyRaw, burnedRaw, logs] = await Promise.all([
    rpc<string>('eth_call', [{ to: ODYS_TOKEN, data: '0x18160ddd' }, 'latest']),
    rpc<string>('eth_call', [
      { to: ODYS_TOKEN, data: `0x70a08231${DEAD_ADDRESS.slice(2).padStart(64, '0')}` },
      'latest',
    ]),
    rpc<RpcLog[]>('eth_getLogs', [
      {
        address: ODYS_TOKEN,
        fromBlock: `0x${ODYS_START_BLOCK.toString(16)}`,
        toBlock: 'latest',
        topics: [TRANSFER_TOPIC, null, topicAddress(DEAD_ADDRESS)],
      },
    ]),
  ]);

  const uniqueBlocks = [...new Set(logs.map((log) => log.blockNumber))];
  const uniqueTransactions = [...new Set(logs.map((log) => log.transactionHash))];
  const [blocks, receipts] = await Promise.all([
    rpcBatch<{ timestamp: string }>(
      uniqueBlocks.map((block) => ({ method: 'eth_getBlockByNumber', params: [block, false] })),
    ),
    rpcBatch<Receipt>(
      uniqueTransactions.map((hash) => ({ method: 'eth_getTransactionReceipt', params: [hash] })),
    ),
  ]);
  const blockTimes = new Map(
    uniqueBlocks.map((block, index) => [block, Number.parseInt(blocks[index]?.timestamp ?? '0x0', 16)]),
  );
  const receiptMap = new Map(uniqueTransactions.map((hash, index) => [hash, receipts[index]]));

  const events: BurnEvent[] = logs
    .map((log) => {
      const from = addressFromTopic(log.topics[1]);
      const receiptLogs = receiptMap.get(log.transactionHash)?.logs ?? [];
      const poolSwap = receiptLogs.some(
        (item) =>
          item.address.toLowerCase() === ODYS_POOL.toLowerCase() &&
          item.topics[0]?.toLowerCase() === SWAP_V3_TOPIC,
      );
      const poolTransferToBurner = receiptLogs.some(
        (item) =>
          item.address.toLowerCase() === ODYS_TOKEN.toLowerCase() &&
          item.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
          addressFromTopic(item.topics[1] ?? '').toLowerCase() === ODYS_POOL.toLowerCase() &&
          addressFromTopic(item.topics[2] ?? '').toLowerCase() === from.toLowerCase(),
      );
      return {
        txHash: log.transactionHash,
        blockNumber: Number.parseInt(log.blockNumber, 16),
        timestamp: new Date((blockTimes.get(log.blockNumber) ?? 0) * 1000).toISOString(),
        from,
        amount: hexToToken(log.data),
        kind:
          poolSwap &&
          (from.toLowerCase() === ODYS_POOL.toLowerCase() || poolTransferToBurner)
            ? 'atomic-buyback-burn'
            : 'direct-burn',
      } satisfies BurnEvent;
    })
    .sort((a, b) => b.blockNumber - a.blockNumber);

  const totalSupply = hexToToken(totalSupplyRaw);
  const burnedSupply = hexToToken(burnedRaw);
  const now = Date.now();
  const inWindow = (days: number) =>
    events
      .filter((event) => now - new Date(event.timestamp).getTime() <= days * 86_400_000)
      .reduce((sum, event) => sum + event.amount, 0);
  const atomic = events.filter((event) => event.kind === 'atomic-buyback-burn');

  return {
    totalSupply,
    burnedSupply,
    burnedPct: totalSupply ? (burnedSupply / totalSupply) * 100 : 0,
    circulatingSupply: totalSupply - burnedSupply,
    events,
    burnTransactions: events.length,
    verifiedAtomicBuybackBurns: atomic.length,
    verifiedAtomicBuybackAmount: atomic.reduce((sum, event) => sum + event.amount, 0),
    latestBurnAt: events[0]?.timestamp ?? null,
    last24h: inWindow(1),
    last7d: inWindow(7),
    last30d: inWindow(30),
    officialWalletBurned: events
      .filter((event) => event.from.toLowerCase() === ODYS_CREATOR.toLowerCase())
      .reduce((sum, event) => sum + event.amount, 0),
  };
}

function modelMarket(token: Record<string, unknown>): MarketRow {
  const kind = String(token.kind ?? 'v3');
  const symbol = String(token.symbol ?? '—');
  const volumeAllTime = Number(token.volumeAllTime ?? 0);
  const lockedShare: Record<string, number> = {
    ODYS: 0.978096,
    MILES: 0.730545,
    ARBITRATION: 0.725252,
  };
  const canModel = kind === 'v3';
  return {
    address: String(token.address ?? ''),
    name: String(token.name ?? symbol),
    symbol,
    status: String(token.status ?? 'bonding'),
    kind,
    quote: String(token.quote ?? 'eth').toUpperCase(),
    marketCap: Number(token.marketCap ?? 0),
    volume24h: Number(token.volume24h ?? 0),
    volumeAllTime,
    holders: Number(token.holders ?? 0),
    burnedPct: Number(token.burnedPct ?? 0),
    protocolRevenue: canModel ? volumeAllTime * 0.01 * 0.2 * (lockedShare[symbol] ?? 1) : null,
    revenueMethod: canModel ? 'modeled-v3' : 'unavailable',
    logoUrl: typeof token.logoUrl === 'string' ? token.logoUrl : undefined,
  };
}

function normalizeDaily(rows: Array<Record<string, unknown>>): DailyPoint[] {
  const audited = new Map(auditedDaily.map((row) => [row.date, row]));
  return rows.map((row) => {
    const date = String(row.date ?? '').slice(0, 10);
    const audit = audited.get(date);
    return {
      date,
      volume: Number(row.volumeUsd ?? row.volume ?? 0),
      revenue: audit?.revenue ?? 0,
      launches: Number(row.launches ?? 0),
      graduations: audit?.graduations ?? 0,
    };
  });
}

export async function GET() {
  try {
    const [statsResponse, tokensResponse, dailyResponse, burn] = await Promise.all([
      fetch(`${ODYS_API}/stats`, { next: { revalidate: 30 } }),
      fetch(`${ODYS_API}/tokens`, { next: { revalidate: 30 } }),
      fetch(`${ODYS_API}/daily`, { next: { revalidate: 60 } }),
      loadBurnData(),
    ]);
    if (!statsResponse.ok || !tokensResponse.ok || !dailyResponse.ok) throw new Error('ODYS API unavailable');

    const stats = (await statsResponse.json()) as Record<string, unknown>;
    const tokensPayload = (await tokensResponse.json()) as Array<Record<string, unknown>>;
    const dailyPayload = (await dailyResponse.json()) as Array<Record<string, unknown>>;
    const odys = tokensPayload.find(
      (token) => String(token.address ?? '').toLowerCase() === ODYS_TOKEN.toLowerCase(),
    );
    if (!odys) throw new Error('ODYS token missing');

    const payload: LiveAnalytics = {
      updatedAt: new Date().toISOString(),
      dataSource: 'live',
      stats: {
        tokens: Number(stats.tokens ?? tokensPayload.length),
        volume24h: Number(stats.volume24h ?? 0),
        volumeAllTime: Number(stats.volumeAllTime ?? 0),
        ethPrice: Number(stats.ethPrice ?? stats.ethUsd ?? 0),
      },
      odys: {
        price: Number(odys.price ?? 0),
        marketCap: Number(odys.marketCap ?? 0),
        holders: Number(odys.holders ?? 0),
        volume24h: Number(odys.volume24h ?? 0),
        volumeAllTime: Number(odys.volumeAllTime ?? 0),
      },
      burn,
      daily: normalizeDaily(dailyPayload),
      markets: tokensPayload.map(modelMarket).sort((a, b) => b.volumeAllTime - a.volumeAllTime).slice(0, 20),
    };

    return NextResponse.json(payload, {
      headers: { 'cache-control': 'public, max-age=20, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json(
      { ...fallbackLive, error: error instanceof Error ? error.message : 'Live data unavailable' },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  }
}
