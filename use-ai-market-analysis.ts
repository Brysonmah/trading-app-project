'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveSymbol, DerivWS } from '@deriv/core';
import { getLastDigit } from '@/lib/digit-stats';

type AnalysisBias = 'bullish' | 'bearish' | 'neutral';
export type ContractSuggestion = 'Matches' | 'Differs' | 'Over' | 'Under' | 'Even' | 'Odd';

export interface MarketAnalysis {
  symbol: string;
  displayName: string;
  score: number;
  confidence: number;
  bias: AnalysisBias;
  suggestion: ContractSuggestion;
  reason: string;
  prices: number[];
  lastDigit: number | null;
  updatedAt: number;
}

interface Snapshot {
  prices: number[];
  updatedAt: number;
}

function getSymbolValue(symbol: ActiveSymbol, key: string): string {
  const value = (symbol as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function analyse(symbol: ActiveSymbol, snapshot: Snapshot, fallbackPipSize: number): MarketAnalysis {
  const prices = snapshot.prices;
  const symbolPip = (symbol as unknown as Record<string, unknown>).pip_size;
  const pipSize = typeof symbolPip === 'number' ? symbolPip : fallbackPipSize;
  const name = getSymbolValue(symbol, 'display_name') || getSymbolValue(symbol, 'symbol') || symbol.underlying_symbol;
  const digits = prices.map((price) => getLastDigit(price, pipSize));
  const counts = Array.from({ length: 10 }, (_, digit) => digits.filter((value) => value === digit).length);
  const total = digits.length || 1;
  const maxCount = Math.max(...counts);
  const hotDigit = counts.indexOf(maxCount);
  const evenRate = digits.filter((digit) => digit % 2 === 0).length / total;
  const highRate = digits.filter((digit) => digit >= 5).length / total;
  const changes = prices.slice(1).map((price, index) => price - prices[index]);
  const up = changes.filter((change) => change > 0).length;
  const down = changes.filter((change) => change < 0).length;
  const directional = changes.length ? Math.abs(up - down) / changes.length : 0;
  const recent = digits.slice(-12);
  const recentHot = recent.length ? recent.filter((digit) => digit === hotDigit).length / recent.length : 0;
  const digitEdge = Math.max(0, (maxCount / total) - 0.1);

  let suggestion: ContractSuggestion = 'Matches';
  let bias: AnalysisBias = 'neutral';
  let reason = `Digit ${hotDigit} is appearing ${(maxCount / total * 100).toFixed(1)}% of the sample.`;

  if (recentHot >= 0.2 && digitEdge >= 0.035) {
    suggestion = 'Matches';
    reason = `Digit ${hotDigit} has the strongest frequency and remains active in recent ticks.`;
  } else if (recentHot <= 0.06 && digitEdge >= 0.02) {
    suggestion = 'Differs';
    reason = `Digit ${hotDigit} is relatively uncommon in the recent sample.`;
  } else if (highRate >= 0.58) {
    suggestion = 'Over';
    bias = 'bullish';
    reason = `Digits 5–9 are occurring ${(highRate * 100).toFixed(1)}% of the sample.`;
  } else if (highRate <= 0.42) {
    suggestion = 'Under';
    bias = 'bearish';
    reason = `Digits 0–4 are occurring ${((1 - highRate) * 100).toFixed(1)}% of the sample.`;
  } else if (evenRate >= 0.58) {
    suggestion = 'Even';
    reason = `Even digits are occurring ${(evenRate * 100).toFixed(1)}% of the sample.`;
  } else if (evenRate <= 0.42) {
    suggestion = 'Odd';
    reason = `Odd digits are occurring ${((1 - evenRate) * 100).toFixed(1)}% of the sample.`;
  }

  if (up > down * 1.15) bias = 'bullish';
  if (down > up * 1.15) bias = 'bearish';

  const score = Math.round(Math.min(100, 45 + directional * 25 + digitEdge * 220 + Math.abs(highRate - 0.5) * 45));
  const confidence = Math.round(Math.min(92, 50 + (prices.length >= 30 ? 15 : prices.length) + digitEdge * 180 + directional * 18));

  return {
    symbol: symbol.underlying_symbol,
    displayName: name,
    score,
    confidence,
    bias,
    suggestion,
    reason,
    prices,
    lastDigit: digits.at(-1) ?? null,
    updatedAt: snapshot.updatedAt,
  };
}

export function useAIMarketAnalysis(
  ws: DerivWS | null,
  isConnected: boolean,
  symbols: ActiveSymbol[],
  activeSymbol: ActiveSymbol | null,
  activePrices: number[],
  pipSize: number
) {
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSymbolRef = useRef(activeSymbol);
  const activePricesRef = useRef(activePrices);

  useEffect(() => {
    activeSymbolRef.current = activeSymbol;
    activePricesRef.current = activePrices;
  }, [activeSymbol, activePrices]);

  const candidates = useMemo(() => symbols.filter((item) => item.underlying_symbol).slice(0, 8), [symbols]);

  const scan = useCallback(async () => {
    if (!ws || !isConnected || candidates.length === 0) return;
    setIsScanning(true);
    try {
      const next: Record<string, Snapshot> = {};
      for (const symbol of candidates) {
        if (activeSymbolRef.current?.underlying_symbol === symbol.underlying_symbol && activePricesRef.current.length > 0) {
          next[symbol.underlying_symbol] = { prices: activePricesRef.current.slice(-60), updatedAt: Date.now() };
          continue;
        }
        try {
          const response = await ws.send({
            ticks_history: symbol.underlying_symbol,
            count: 60,
            end: 'latest',
            style: 'ticks',
            adjust_start_time: 1,
          });
          const history = response as Record<string, unknown>;
          const prices = Array.isArray(history.prices)
            ? history.prices.filter((value): value is number => typeof value === 'number')
            : [];
          if (prices.length) next[symbol.underlying_symbol] = { prices, updatedAt: Date.now() };
        } catch {
          // One unavailable market should not stop the scanner.
        }
      }
      setSnapshots((current) => ({ ...current, ...next }));
      setLastScan(Date.now());
    } finally {
      setIsScanning(false);
    }
  }, [ws, isConnected, candidates]);

  useEffect(() => {
    void scan();
    timerRef.current = setInterval(() => void scan(), 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scan]);

  useEffect(() => {
    if (!activeSymbol || activePrices.length === 0) return;
    setSnapshots((current) => ({
      ...current,
      [activeSymbol.underlying_symbol]: { prices: activePrices.slice(-60), updatedAt: Date.now() },
    }));
  }, [activeSymbol, activePrices]);

  const analyses = useMemo(
    () => candidates
      .map((symbol) => {
        const snapshot = snapshots[symbol.underlying_symbol];
        return snapshot && snapshot.prices.length >= 8 ? analyse(symbol, snapshot, pipSize) : null;
      })
      .filter((item): item is MarketAnalysis => item !== null)
      .sort((a, b) => b.score - a.score),
    [candidates, snapshots, pipSize]
  );

  return { analyses, isScanning, lastScan, rescan: scan };
}
