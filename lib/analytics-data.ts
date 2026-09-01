export const ODYS_TOKEN = '0x018D6a98555686bE1CA5b6896ef6c42cf67E2BD1';
export const ODYS_POOL = '0x628854F0CFD7Debd6E04361421Ee9c06C77048c3';
export const ODYS_CREATOR = '0x986dD31B1349367733269DDee7a19812071DB600';
export const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';
export const ODYS_START_BLOCK = 493_361_691;

export type DailyPoint = {
  date: string;
  volume: number;
  revenue: number;
  launches: number;
  graduations: number;
  burned?: number;
};

export type MarketRow = {
  address: string;
  name: string;
  symbol: string;
  status: string;
  kind: string;
  quote: string;
  marketCap: number;
  volume24h: number;
  volumeAllTime: number;
  holders: number;
  burnedPct: number;
  protocolRevenue: number | null;
  revenueMethod: 'audited' | 'modeled-v3' | 'unavailable';
  logoUrl?: string;
};

export type BurnEvent = {
  txHash: string;
  blockNumber: number;
  timestamp: string;
  from: string;
  amount: number;
  kind: 'atomic-buyback-burn' | 'direct-burn';
};

export type LiveAnalytics = {
  updatedAt: string;
  dataSource: 'live' | 'fallback';
  stats: { tokens: number; volume24h: number; volumeAllTime: number; ethPrice: number };
  odys: { price: number; marketCap: number; holders: number; volume24h: number; volumeAllTime: number };
  burn: {
    totalSupply: number;
    burnedSupply: number;
    burnedPct: number;
    circulatingSupply: number;
    events: BurnEvent[];
    burnTransactions: number;
    verifiedAtomicBuybackBurns: number;
    verifiedAtomicBuybackAmount: number;
    latestBurnAt: string | null;
    last24h: number;
    last7d: number;
    last30d: number;
    officialWalletBurned: number;
  };
  daily: DailyPoint[];
  markets: MarketRow[];
};

export const auditedDaily: DailyPoint[] = [
  { date: '2026-08-25', volume: 413064.62, revenue: 1694.26, launches: 2, graduations: 1 },
  { date: '2026-08-26', volume: 1132411.63, revenue: 2755.47, launches: 27, graduations: 1 },
  { date: '2026-08-27', volume: 908679.86, revenue: 2113.35, launches: 14, graduations: 1 },
  { date: '2026-08-28', volume: 504956.06, revenue: 1015.51, launches: 10, graduations: 0 },
  { date: '2026-08-29', volume: 338662.04, revenue: 671.4, launches: 3, graduations: 0 },
  { date: '2026-08-30', volume: 1119004.11, revenue: 2239.53, launches: 27, graduations: 2 },
  { date: '2026-08-31', volume: 6660302.21, revenue: 13248.31, launches: 96, graduations: 5 },
];

export const periodMetrics = {
  '24h': { label: 'Latest completed UTC day', volume: 6660302.21, revenue: 13248.31, arr: 4835632.51, launches: 96, graduations: 5, grossFees: 65649.25, creatorRevenue: 52400.94, takeRate: 0.1989 },
  '7d': { label: '7 completed UTC days', volume: 11077080.53, revenue: 23737.83, arr: 1237758.3, launches: 179, graduations: 10, grossFees: 117580.55, creatorRevenue: 93842.72, takeRate: 0.2143 },
  '30d': { label: '21 available completed days', volume: 17464626.0, revenue: 36337.42, arr: 631578.99, launches: 568, graduations: 16, grossFees: 178693.26, creatorRevenue: 142954.61, takeRate: 0.2081 },
  all: { label: 'All 21 completed protocol days', volume: 17464626.0, revenue: 36337.42, arr: 631578.99, launches: 568, graduations: 16, grossFees: 178693.26, creatorRevenue: 142954.61, takeRate: 0.2081 },
} as const;

export const fallbackLive: LiveAnalytics = {
  updatedAt: '2026-09-01T08:16:00.000Z',
  dataSource: 'fallback',
  stats: { tokens: 583, volume24h: 6985713.49, volumeAllTime: 17780691.98, ethPrice: 2459.15 },
  odys: { price: 0.00485562993, marketCap: 4855629.93, holders: 1488, volume24h: 2966611.11, volumeAllTime: 8119617.67 },
  burn: {
    totalSupply: 1_000_000_000,
    burnedSupply: 69_161_514.409982,
    burnedPct: 6.9161514409982,
    circulatingSupply: 930_838_485.590018,
    events: [],
    burnTransactions: 11,
    verifiedAtomicBuybackBurns: 0,
    verifiedAtomicBuybackAmount: 0,
    latestBurnAt: null,
    last24h: 0,
    last7d: 0,
    last30d: 0,
    officialWalletBurned: 69_161_514.409982,
  },
  daily: auditedDaily,
  markets: [],
};
