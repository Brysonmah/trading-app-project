'use client';

import type { DigitStats, TradeType } from '../lib/types';

type Props = {
  digitStats: DigitStats;
  lastDigit: number | null;
  isConnected: boolean;
  marketName: string;
  tradeType: TradeType;
};

export function AIDigitAnalysis({
  digitStats,
  lastDigit,
  isConnected,
  marketName,
  tradeType,
}: Props) {
  const counts = Array.isArray(digitStats?.counts)
    ? digitStats.counts
    : Array(10).fill(0);

  const percentages = Array.isArray(digitStats?.percentages)
    ? digitStats.percentages
    : Array(10).fill(0);

  const totalTicks = Number(digitStats?.totalTicks ?? 0);
  const normalizedTradeType: TradeType = tradeType ?? 'over-under';
  const hasData = totalTicks > 0 && percentages.length > 0;

  const evenCount = counts.reduce(
    (sum, count, digit) => sum + (digit % 2 === 0 ? count : 0),
    0
  );

  const evenPct = hasData ? (evenCount / totalTicks) * 100 : 0;
  const oddPct = hasData ? 100 - evenPct : 0;

  const maxPct = hasData ? Math.max(...percentages) : 0;
  const minPct = hasData ? Math.min(...percentages) : 0;

  const highestDigits = percentages
    .map((pct, digit) => ({ pct, digit }))
    .filter((item) => hasData && item.pct === maxPct)
    .map((item) => item.digit);

  const lowestDigits = percentages
    .map((pct, digit) => ({ pct, digit }))
    .filter((item) => hasData && item.pct === minPct)
    .map((item) => item.digit);

  const paritySummary =
    evenPct === oddPct
      ? 'Even and odd appeared equally often in this sample.'
      : evenPct > oddPct
        ? `Even appeared more often (${evenPct.toFixed(1)}% vs ${oddPct.toFixed(1)}%).`
        : `Odd appeared more often (${oddPct.toFixed(1)}% vs ${evenPct.toFixed(1)}%).`;

  return (
    <section
      className="mt-4 rounded-xl border bg-card p-4 text-card-foreground"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Mahtradinghub AI Analysis</h3>

        <span
          className={`rounded-full px-2.5 py-1 text-xs ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {marketName} · {normalizedTradeType.replace(/-/g, ' ')}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Ticks in sample</p>
          <p className="mt-1 text-xl font-semibold">
            {totalTicks.toLocaleString()}
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Latest last digit</p>
          <p className="mt-1 text-xl font-semibold">
            {lastDigit === null ? '—' : lastDigit}
          </p>
        </div>
      </div>

      {normalizedTradeType === 'even-odd' ? (
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm">
              <span>Even</span>
              <span>{hasData ? `${evenPct.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${hasData ? evenPct : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <span>Odd</span>
              <span>{hasData ? `${oddPct.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary/50"
                style={{ width: `${hasData ? oddPct : 0}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Observed digit frequency · baseline 10% each
          </p>

          <div className="grid grid-cols-5 gap-2">
            {percentages.map((pct, digit) => (
              <div
                key={digit}
                className="rounded-md border p-2 text-center"
              >
                <p className="text-sm font-semibold">{digit}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasData ? `${pct.toFixed(1)}%` : '—'}
                </p>
              </div>
            ))}
          </div>

          {hasData && (
            <p className="mt-2 text-xs text-muted-foreground">
              Highest observed: {highestDigits.join(', ')}
              {' · '}
              Lowest observed: {lowestDigits.join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-sm font-semibold">Assessment: No confirmed edge</p>

        <p className="mt-1 text-sm text-muted-foreground">
          {!isConnected
            ? 'Waiting for a live market connection.'
            : totalTicks === 0
              ? 'Waiting for tick observations.'
              : normalizedTradeType === 'even-odd'
                ? paritySummary
                : 'The frequency differences describe this sample; they do not reliably predict the next digit.'}
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          Informational analysis only. Recent streaks are not guarantees.
          Consider contract payout, risk and out-of-sample testing before
          trading.
        </p>
      </div>
    </section>
  );
}
