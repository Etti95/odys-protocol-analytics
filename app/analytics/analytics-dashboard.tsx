'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import {
  DEAD_ADDRESS,
  ODYS_CREATOR,
  ODYS_TOKEN,
  auditedDaily,
  fallbackLive,
  periodMetrics,
  type DailyPoint,
  type LiveAnalytics,
  type MarketRow,
} from '../../lib/analytics-data';

type Period = keyof typeof periodMetrics;
type ChartMetric = 'volume' | 'revenue' | 'launches';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const precise = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function money(value: number, compactMode = true) {
  if (!Number.isFinite(value)) return '—';
  return `$${compactMode ? compact.format(value) : precise.format(value)}`;
}

function tokenAmount(value: number) {
  return `${compact.format(value)} ODYS`;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    volume: <><path d="M4 17V9m6 8V4m6 13v-6m4 6V7"/><path d="M2 21h20"/></>,
    revenue: <><path d="M12 2v20M17 6.2c-.9-1.1-2.4-1.7-4.2-1.7-2.5 0-4.3 1.2-4.3 3.3 0 5.1 8.4 2.6 8.4 7.8 0 2.1-1.8 3.6-4.6 3.6-2 0-3.8-.7-4.9-2"/></>,
    arr: <><path d="M4 17 9 12l4 3 7-9"/><path d="M14 6h6v6"/></>,
    launches: <><path d="M14.5 5.5 18 2l4 4-3.5 3.5"/><path d="m13 7 4 4-7 7H6v-4Z"/><path d="M6 18 3 21m6-10-4-1-3 3 4 1m5 5 1 3 3-3-1-4"/></>,
    graduate: <><path d="m3 8 9-5 9 5-9 5Z"/><path d="M7 10.5V16c3 2 7 2 10 0v-5.5M21 8v6"/></>,
    trade: <><path d="M7 7h13l-3-3m3 3-3 3M17 17H4l3 3m-3-3 3-3"/></>,
    users: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0m1-16a4 4 0 0 1 0 7m1 2a6 6 0 0 1 4 6"/></>,
    fire: <path d="M12 22c4.4 0 8-3.1 8-7.5 0-3.6-2.2-6.3-5.7-9.4.2 2.2-.6 3.6-1.8 4.4.1-3.5-1.7-5.8-4.2-7.5.2 3.7-4.3 6.4-4.3 12.5C4 18.9 7.6 22 12 22Zm0-3.5c-1.7 0-3-1.2-3-2.9 0-1.5.9-2.5 2.5-4.2-.1 1.4.5 2 1.1 2.5.4-.8.6-1.7.3-2.7 1.4 1.3 2.1 2.7 2.1 4.4 0 1.7-1.3 2.9-3 2.9Z"/>,
    chain: <><path d="m10 13 4-4"/><path d="M7.5 15.5 5 18a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0"/><path d="m16 8 3-3a3.5 3.5 0 1 1 5 5l-2.5 2.5a3.5 3.5 0 0 1-5 0"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function MetricCard({ icon, label, value, note, accent, live }: { icon: string; label: string; value: string; note: string; accent?: boolean; live?: boolean }) {
  return (
    <article className={`metric-card ${accent ? 'metric-card--accent' : ''}`}>
      <div className="metric-card__top">
        <span className="metric-card__icon"><Icon name={icon} /></span>
        {live && <span className="live-chip"><i /> live</span>}
      </div>
      <span className="metric-card__label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function BarChart({ rows, metric, cumulative = false }: { rows: DailyPoint[]; metric: ChartMetric; cumulative?: boolean }) {
  const values = rows.map((row) => Number(row[metric] ?? 0));
  const plotted = cumulative
    ? values.map((_, index) => values.slice(0, index + 1).reduce((sum, value) => sum + value, 0))
    : values;
  const max = Math.max(...plotted, 1);
  const formatValue = (value: number) => metric === 'launches' ? integer.format(value) : money(value);
  return (
    <div className="bar-chart" role="img" aria-label={`${cumulative ? 'Cumulative ' : 'Daily '}${metric} chart`}>
      <div className="chart-grid"><i /><i /><i /><i /></div>
      <div className="chart-bars">
        {rows.map((row, index) => (
          <div className="bar-slot" key={`${row.date}-${metric}`}>
            <i style={{ height: `${Math.max(2, (plotted[index] / max) * 100)}%` }}>
              <span>{formatValue(plotted[index])}</span>
            </i>
          </div>
        ))}
      </div>
      <div className="chart-axis">
        <span>{rows[0]?.date.slice(5).replace('-', '/')}</span>
        <span>{rows.at(-1)?.date.slice(5).replace('-', '/')} UTC</span>
      </div>
    </div>
  );
}

function BurnChart({ data }: { data: LiveAnalytics }) {
  const byDate = new Map<string, number>();
  data.burn.events.forEach((event) => {
    const date = event.timestamp.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + event.amount);
  });
  const rows = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...rows.map(([, amount]) => amount), 1);
  if (!rows.length) return <div className="burn-empty">Live event history reconnecting…</div>;
  return (
    <div className="burn-bars" aria-label="ODYS burn event timeline">
      {rows.map(([date, amount]) => (
        <div className="burn-bar" key={date} title={`${date}: ${precise.format(amount)} ODYS`}>
          <i style={{ height: `${Math.max(6, (amount / max) * 100)}%` }} />
          <span>{date.slice(5).replace('-', '/')}</span>
        </div>
      ))}
    </div>
  );
}

function MarketTable({ markets }: { markets: MarketRow[] }) {
  const [sort, setSort] = useState<'volume' | 'revenue'>('volume');
  const rows = useMemo(
    () => [...markets].sort((a, b) => sort === 'volume' ? b.volumeAllTime - a.volumeAllTime : (b.protocolRevenue ?? -1) - (a.protocolRevenue ?? -1)).slice(0, 12),
    [markets, sort],
  );
  return (
    <section className="panel markets-panel">
      <div className="section-head">
        <div><span className="eyebrow">Protocol markets</span><h2>Top markets</h2></div>
        <div className="mini-switch" aria-label="Sort markets">
          <button className={sort === 'volume' ? 'active' : ''} onClick={() => setSort('volume')}>Volume</button>
          <button className={sort === 'revenue' ? 'active' : ''} onClick={() => setSort('revenue')}>Revenue</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Market</th><th>Status</th><th>Market cap</th><th>24h volume</th><th>All-time volume</th><th>Protocol revenue</th><th>Share</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((market, index) => (
              <tr key={market.address}>
                <td className="rank">{String(index + 1).padStart(2, '0')}</td>
                <td><a className="market-name" href={`https://odys.fun/token/${market.address}`} target="_blank" rel="noreferrer">
                  <span className="market-logo">{market.logoUrl ? <img src={market.logoUrl} alt="" /> : market.symbol.slice(0, 2)}</span>
                  <span><b>{market.name}</b><small>${market.symbol} · {market.quote}</small></span>
                </a></td>
                <td><span className={`status ${market.status === 'amm' ? 'status--grad' : ''}`}>{market.status === 'amm' ? 'Graduated' : 'Bonding'}</span></td>
                <td>{money(market.marketCap)}</td><td>{money(market.volume24h)}</td><td>{money(market.volumeAllTime)}</td>
                <td>{market.protocolRevenue === null ? <span className="muted">Exact events required</span> : <span title="Modeled from the verified Classic v3 fee path and token-specific locked LP share">≈ {money(market.protocolRevenue)}</span>}</td>
                <td>{market.burnedPct > 0 ? <span className="burn-share"><Icon name="fire" size={12}/>{market.burnedPct.toFixed(2)}%</span> : '—'}</td>
              </tr>
            )) : <tr><td colSpan={8} className="table-empty">Live market tape reconnecting…</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="panel-note"><Icon name="info" size={14}/> Classic v3 revenue is modeled from its verified 1% pool fee, 20% protocol share, and known LP dilution. Elite v4 revenue is withheld here until exact <code>SwapFees</code> events are indexed.</p>
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('7d');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('volume');
  const [data, setData] = useState<LiveAnalytics>(fallbackLive);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/analytics', { cache: 'no-store' });
        const payload = (await response.json()) as LiveAnalytics;
        if (active) setData(payload);
      } catch { /* Keep the audited fallback visible. */ }
      finally { if (active) setRefreshing(false); }
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const metric = periodMetrics[period];
  // Chart and headline share one frozen completed-day audit source.
  const chartRows = auditedDaily;
  const burnNotional = data.burn.burnedSupply * data.odys.price;
  const graduationRate = (16 / 568) * 100;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="https://odys.fun" target="_blank" rel="noreferrer"><span className="brand-mark"><i/><i/><i/></span><strong>ODYS</strong><em>/ analytics</em></a>
        <nav><a href="#overview" className="active">Overview</a><a href="#burn">Buyback & burn</a><a href="#markets">Markets</a><a href="#methodology">Methodology</a></nav>
        <div className="network"><i/><span>Arbitrum One</span><small>{refreshing ? 'syncing' : data.dataSource}</small></div>
      </header>

      <div className="dashboard">
        <section className="hero" id="overview">
          <div><span className="eyebrow">Protocol intelligence · Onchain verified</span><h1>The ODYS economy,<br/><em>measured end to end.</em></h1><p>Trading, protocol revenue, annualized run rate and token supply reduction across every verified ODYS market.</p></div>
          <div className="hero-meta"><span><i className="pulse"/>Data through {new Date(data.updatedAt).toLocaleString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} UTC</span><span>Revenue audit cutoff · 31 Aug 2026</span></div>
        </section>

        <div className="period-row">
          <div className="period-switch" aria-label="Analytics period">
            {(['24h', '7d', '30d', 'all'] as Period[]).map((item) => <button key={item} onClick={() => setPeriod(item)} className={period === item ? 'active' : ''}>{item === 'all' ? 'All time' : item.toUpperCase()}</button>)}
          </div>
          <span>{metric.label} · partial current day excluded from audited revenue</span>
        </div>

        <section className="metrics-grid">
          <MetricCard icon="volume" label="Trading volume" value={money(metric.volume)} note={period === '7d' ? `${money(data.stats.volume24h)} live 24h` : metric.label} />
          <MetricCard icon="revenue" label="Protocol revenue" value={money(metric.revenue)} note="ODYS only · creator share excluded" />
          <MetricCard icon="arr" label="Annualized revenue" value={money(metric.arr)} note={period === '7d' ? 'Recommended headline ARR' : 'Annualized protocol revenue'} accent />
          <MetricCard icon="launches" label="Token launches" value={integer.format(metric.launches)} note={`${integer.format(data.stats.tokens)} live index total`} live />
          <MetricCard icon="graduate" label="Graduated markets" value={integer.format(metric.graduations)} note={`${graduationRate.toFixed(2)}% all-time graduation rate`} />
          <MetricCard icon="trade" label="Verified trades" value="4,262" note="Exact Elite v4 coverage only" />
          <MetricCard icon="users" label="Unique traders" value="1,168" note="Exact Elite v4 senders only" />
        </section>

        <section className="economics-row">
          <div><span>Gross controlled fees</span><strong>{money(metric.grossFees)}</strong><small>{((metric.grossFees / metric.volume) * 100).toFixed(3)}% realized gross rate</small></div>
          <div><span>Creator earnings</span><strong>{money(metric.creatorRevenue)}</strong><small>80% of ODYS-controlled fees</small></div>
          <div><span>Effective take rate</span><strong>{metric.takeRate.toFixed(3)}%</strong><small>Protocol revenue ÷ trading volume</small></div>
          <div><span>Launch revenue</span><strong>{period === '24h' ? money(96 * 0.0005 * 2459.15) : period === '7d' ? money(179 * 0.0005 * 2459.15) : '$598.77'}</strong><small>0.0005 ETH per verified launch</small></div>
        </section>

        <section className="chart-panel panel">
          <div className="section-head"><div><span className="eyebrow">Completed UTC days</span><h2>{chartMetric === 'volume' ? 'Daily trading volume' : chartMetric === 'revenue' ? 'Daily protocol revenue' : 'Daily token launches'}</h2></div><div className="mini-switch">{(['volume', 'revenue', 'launches'] as ChartMetric[]).map((item) => <button key={item} className={chartMetric === item ? 'active' : ''} onClick={() => setChartMetric(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div>
          <div className="chart-summary"><strong>{chartMetric === 'launches' ? integer.format(chartRows.reduce((sum, row) => sum + row.launches, 0)) : money(chartRows.reduce((sum, row) => sum + Number(row[chartMetric]), 0), false)}</strong><span>{chartRows.length} completed days shown</span></div>
          <BarChart rows={chartRows} metric={chartMetric} />
        </section>

        <section className="burn-section" id="burn">
          <div className="burn-intro"><span className="eyebrow">ODYS supply monitor</span><h2>Buyback & burn</h2><p>Burned supply is read directly from the ODYS balance at <a href={`https://arbiscan.io/address/${DEAD_ADDRESS}`} target="_blank" rel="noreferrer">0x…dEaD <Icon name="external" size={13}/></a>. A buyback is counted only when acquisition and burn are proven inside the same receipt.</p></div>
          <div className="burn-grid">
            <article className="panel burn-main">
              <div className="burn-ring" style={{ '--burn': `${data.burn.burnedPct * 3.6}deg` } as React.CSSProperties}><div><Icon name="fire" size={23}/><strong>{data.burn.burnedPct.toFixed(4)}%</strong><span>of supply burned</span></div></div>
              <div className="burn-total"><span>Permanently removed</span><strong>{precise.format(data.burn.burnedSupply)}</strong><b>ODYS</b><small>{money(burnNotional)} current notional value · not historical buyback spend</small></div>
              <div className="supply-track"><i style={{ width: `${data.burn.burnedPct}%` }}/></div>
              <div className="supply-labels"><span><i className="dot dot--burn"/>Burned {tokenAmount(data.burn.burnedSupply)}</span><span><i className="dot"/>Circulating {tokenAmount(data.burn.circulatingSupply)}</span></div>
            </article>
            <article className="panel burn-stat"><span>Verified atomic buybacks</span><strong>{data.burn.verifiedAtomicBuybackBurns}</strong><small>{tokenAmount(data.burn.verifiedAtomicBuybackAmount)} · strict receipt proof</small><em className="verification"><Icon name="check" size={13}/> No inferred buys</em></article>
            <article className="panel burn-stat"><span>Burn transactions</span><strong>{integer.format(data.burn.burnTransactions)}</strong><small>{tokenAmount(data.burn.officialWalletBurned)} sent by token creator</small><a href={`https://arbiscan.io/token/${ODYS_TOKEN}?a=${DEAD_ADDRESS}`} target="_blank" rel="noreferrer">View onchain <Icon name="external" size={12}/></a></article>
            <article className="panel burn-stat"><span>Burned in 7 days</span><strong>{tokenAmount(data.burn.last7d)}</strong><small>24h {tokenAmount(data.burn.last24h)} · 30d {tokenAmount(data.burn.last30d)}</small><em className="live-label"><i/>updates every 30 sec</em></article>
            <article className="panel burn-history"><div className="section-head"><div><span className="eyebrow">Cumulative reduction events</span><h3>Burn cadence</h3></div><strong>{data.burn.burnTransactions} events</strong></div><BurnChart data={data}/></article>
          </div>
          <div className="burn-events panel">
            <div className="section-head"><div><span className="eyebrow">Chain receipts</span><h3>Recent burns</h3></div><span>Source wallet classification</span></div>
            <div className="event-list">{data.burn.events.slice(0, 5).map((event) => <a href={`https://arbiscan.io/tx/${event.txHash}`} target="_blank" rel="noreferrer" key={event.txHash}><span className={`event-icon ${event.kind === 'atomic-buyback-burn' ? 'event-icon--buyback' : ''}`}><Icon name={event.kind === 'atomic-buyback-burn' ? 'chain' : 'fire'} size={16}/></span><span><b>{event.kind === 'atomic-buyback-burn' ? 'Verified buyback + burn' : 'Direct burn'}</b><small>{shortAddress(event.from)}{event.from.toLowerCase() === ODYS_CREATOR.toLowerCase() ? ' · ODYS creator wallet' : ''}</small></span><strong>{tokenAmount(event.amount)}</strong><time>{new Date(event.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time><Icon name="external" size={13}/></a>)}</div>
          </div>
        </section>

        <div id="markets"><MarketTable markets={data.markets}/></div>

        <section className="methodology panel" id="methodology">
          <div><span className="eyebrow">Transparent by construction</span><h2>What the dashboard counts</h2><p>Revenue metrics are audited through the latest completed day. Live volume, markets and ODYS burn state refresh independently, so a partial UTC day never distorts the ARR.</p></div>
          <div className="method-grid"><div><b>Revenue</b><span>Classic: 1% v3 pool fee × locked LP ownership × 20% protocol. Elite: exact hook <code>SwapFees</code> × 20%. Plus 0.0005 ETH launch fees.</span></div><div><b>Burned supply</b><span><code>balanceOf(0x…dEaD)</code> ÷ immutable 1B total supply. Transfer logs form the event timeline.</span></div><div><b>Buybacks</b><span>Strict evidence only: the same transaction receipt must contain an ODYS pool acquisition and transfer to the dead address.</span></div></div>
        </section>
      </div>

      <footer><div className="brand"><span className="brand-mark"><i/><i/><i/></span><strong>ODYS</strong></div><p>Onchain markets on Arbitrum One.</p><div><a href="https://odys.fun" target="_blank" rel="noreferrer">Markets</a><a href="https://x.com/odysfun" target="_blank" rel="noreferrer">X / Twitter</a><a href={`https://arbiscan.io/token/${ODYS_TOKEN}`} target="_blank" rel="noreferrer">Contract</a></div></footer>
    </main>
  );
}
