'use client';

import { BrainCircuit, RefreshCw, ShieldAlert, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MarketAnalysis } from '@/hooks/use-ai-market-analysis';

export function AIMarketAnalyst({ analyses, isScanning, lastScan, onRescan, activeSymbol }: {
  analyses: MarketAnalysis[];
  isScanning: boolean;
  lastScan: number | null;
  onRescan: () => void;
  activeSymbol?: string;
}) {
  const active = analyses.find((item) => item.symbol === activeSymbol) ?? analyses[0];

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Market Analyst
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onRescan} disabled={isScanning} aria-label="Refresh market analysis">
            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Live tick-frequency analysis. Refreshes automatically every 15 seconds.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{active.displayName}</p>
                <p className="text-xs text-muted-foreground">{active.symbol}</p>
              </div>
              <Badge variant="secondary">{active.confidence}% confidence</Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              {active.bias === 'bullish' ? <TrendingUp className="h-4 w-4" /> : active.bias === 'bearish' ? <TrendingDown className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              <span>{active.suggestion} setup</span>
              <span className="text-muted-foreground">• Score {active.score}/100</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{active.reason}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Collecting live market data…</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Markets to watch</span>
            <span className="text-muted-foreground">{analyses.length} scanned</span>
          </div>
          {analyses.slice(0, 5).map((item) => (
            <div key={item.symbol} className="flex items-center justify-between rounded-md border p-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.displayName}</p>
                <p className="text-[11px] text-muted-foreground">{item.suggestion} • {item.confidence}%</p>
              </div>
              <Badge variant="outline">{item.score}</Badge>
            </div>
          ))}
        </div>

        <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Analysis is probabilistic and based on recent ticks. It is not a guarantee of profit; confirm conditions before placing a trade.</span>
        </div>
        {lastScan && <p className="text-[10px] text-muted-foreground">Last scan: {new Date(lastScan).toLocaleTimeString()}</p>}
      </CardContent>
    </Card>
  );
}
