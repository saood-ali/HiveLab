import { useMemo } from 'react';
import './ConvergenceChart.css';

/**
 * Compact Convergence Line Chart (Pure SVG).
 * Tracks the best objective function value f(x*) across completed cycles.
 */
export function ConvergenceChart({ convergenceHistory, maxCycles }) {
  // convergenceHistory is an array of { cycle: number, bestF: number }
  const data = useMemo(() => {
    if (!convergenceHistory || convergenceHistory.length === 0) {
      return [{ cycle: 0, bestF: 0 }];
    }
    return convergenceHistory;
  }, [convergenceHistory]);

  const W = 400;
  const H = 160;
  const PAD_X = 40;
  const PAD_Y = 25;

  const plotW = W - 2 * PAD_X;
  const plotH = H - 2 * PAD_Y;

  const minCycle = 0;
  const maxC = Math.max(maxCycles || 10, data[data.length - 1].cycle, 1);

  const fValues = data.map((d) => d.bestF);
  const minF = Math.min(...fValues);
  const maxF = Math.max(...fValues);
  const fSpan = maxF - minF || 1;

  const toX = (c) => PAD_X + ((c - minCycle) / (maxC - minCycle)) * plotW;
  const toY = (f) => H - PAD_Y - ((f - minF) / fSpan) * plotH;

  const pointsStr = data.map((d) => `${toX(d.cycle)},${toY(d.bestF)}`).join(' ');
  const latest = data[data.length - 1];

  return (
    <div className="conv-container" role="region" aria-label="Convergence History Chart">
      <div className="conv-header">
        <h4 style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
          Convergence Trend (Best Objective vs. Cycles)
        </h4>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          Current best: f = {latest.bestF.toFixed(4)}
        </span>
      </div>

      <div className="conv-svg-wrapper">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
          {/* Grid lines */}
          <line
            x1={PAD_X}
            y1={H - PAD_Y}
            x2={W - PAD_X}
            y2={H - PAD_Y}
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <line
            x1={PAD_X}
            y1={PAD_Y}
            x2={PAD_X}
            y2={H - PAD_Y}
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />

          {/* Area fill under curve */}
          {data.length > 1 && (
            <polygon
              points={`${toX(data[0].cycle)},${H - PAD_Y} ${pointsStr} ${toX(latest.cycle)},${H - PAD_Y}`}
              fill="rgba(255, 212, 0, 0.15)"
            />
          )}

          {/* Line curve */}
          {data.length > 1 && (
            <polyline
              points={pointsStr}
              fill="none"
              stroke="#111111"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {data.map((d, i) => (
            <g key={i} transform={`translate(${toX(d.cycle)}, ${toY(d.bestF)})`}>
              <circle
                r={i === data.length - 1 ? 4 : 3}
                fill={i === data.length - 1 ? 'var(--color-accent)' : '#111111'}
                stroke="#ffffff"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Y Axis Labels */}
          <text
            x={PAD_X - 6}
            y={toY(maxF) + 4}
            fontSize="10"
            textAnchor="end"
            fill="var(--color-text-secondary)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {maxF.toFixed(1)}
          </text>
          <text
            x={PAD_X - 6}
            y={toY(minF) + 4}
            fontSize="10"
            textAnchor="end"
            fill="var(--color-text-secondary)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {minF.toFixed(1)}
          </text>

          {/* X Axis Labels */}
          <text
            x={PAD_X}
            y={H - 6}
            fontSize="10"
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontFamily="'JetBrains Mono', monospace"
          >
            0
          </text>
          <text
            x={W - PAD_X}
            y={H - 6}
            fontSize="10"
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {maxC}
          </text>
          <text
            x={W / 2}
            y={H - 6}
            fontSize="10"
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontWeight="bold"
          >
            Cycles →
          </text>
        </svg>
      </div>

      <div className="conv-meta">
        <span>Cycle 0 (Init): {data[0]?.bestF.toFixed(4) || '—'}</span>
        <span>Latest Cycle {latest.cycle}: {latest.bestF.toFixed(4)}</span>
      </div>
    </div>
  );
}
