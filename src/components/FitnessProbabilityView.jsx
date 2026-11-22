import './FitnessProbabilityView.css';

export function FitnessProbabilityView({ population, currentEvent, bestSoFar }) {
  const maxFit = Math.max(...population.map((s) => s.fit), 0.0001);

  return (
    <div className="fitness-prob-card" role="region" aria-label="Fitness and Selection Probability View">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
          Source Selection Distribution (Onlooker Bee Bias)
        </h4>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Rule: p_m = 0.9 × (fit / max_fit) + 0.1
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 'var(--space-3)', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
        <span>Source</span>
        <span>Fitness (Maximised)</span>
        <span>Selection Prob (p_m)</span>
      </div>

      <div>
        {population.map((src) => {
          const isActive = currentEvent?.sourceId === src.id;
          const isBest = bestSoFar?.id === src.id;
          const fitPercent = Math.min(100, Math.max(0, (src.fit / maxFit) * 100));
          const probPercent = Math.min(100, Math.max(0, (src.p || 0.1) * 100));

          return (
            <div
              key={src.id}
              className={`fp-row${isActive ? ' fp-row--active' : ''}`}
            >
              <div className="fp-source-label">
                #{src.id}
                {isBest && <span style={{ color: '#855b00' }}>★</span>}
                {isActive && <span style={{ color: 'var(--color-accent)' }}>●</span>}
              </div>

              {/* Fitness Bar */}
              <div className="fp-bar-wrap">
                <div className="fp-bar-track">
                  <div
                    className="fp-bar-fill fp-bar-fill--fit"
                    style={{ width: `${fitPercent}%` }}
                  />
                </div>
                <div className="fp-bar-meta">
                  <span>fit</span>
                  <span>{src.fit.toFixed(4)}</span>
                </div>
              </div>

              {/* Probability Bar */}
              <div className="fp-bar-wrap">
                <div className="fp-bar-track">
                  <div
                    className="fp-bar-fill fp-bar-fill--prob"
                    style={{ width: `${probPercent}%` }}
                  />
                </div>
                <div className="fp-bar-meta">
                  <span>prob</span>
                  <span>{src.p !== undefined ? src.p.toFixed(3) : '—'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 'var(--line-height-normal)' }}>
        💡 <strong>Key Takeaway:</strong> The fittest source receives pₘ = 1.0, while the +0.1 probability floor guarantees that even poor sources retain a chance of exploration by onlookers.
      </div>
    </div>
  );
}
