import { useRef, useEffect, useState, useMemo } from 'react';
import './ContourPlot.css';

/**
 * 2D Objective Contour Plot & Swarm Visualizer.
 *
 * Rules from PROJECT_PLAN.md and design.md:
 * - Canvas renders the underlying objective landscape contour/shading once per problem/bounds.
 * - SVG overlay renders food sources, active candidate, best-so-far, and movement arrows.
 * - Accepted, rejected, and scout moves are visibly distinguishable using both line styles and shapes.
 * - Play/Pause animation ONLY pulses the movement line of the current step; NEVER advances algorithm state.
 */
export function ContourPlot({ problem, bounds, population, currentEvent, bestSoFar }) {
  const canvasRef = useRef(null);
  const [animating, setAnimating] = useState(true);
  const [animOffset, setAnimOffset] = useState(0);
  const [hoveredSource, setHoveredSource] = useState(null);

  const xMin = bounds.lower[0];
  const xMax = bounds.upper[0];
  const yMin = bounds.lower[1];
  const yMax = bounds.upper[1];

  // Canvas coordinate mapping helper
  // SVG viewBox is 0 0 400 400 with a 36px margin for axes
  const PAD = 36;
  const SIZE = 400;
  const PLOT_W = SIZE - 2 * PAD;
  const PLOT_H = SIZE - 2 * PAD;

  const toSvgX = (x) => PAD + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const toSvgY = (y) => SIZE - PAD - ((y - yMin) / (yMax - yMin)) * PLOT_H; // invert Y for screen coords

  // Draw contour background on canvas once when problem/bounds change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Sample objective function across grid
    const resolution = width;
    const values = new Float32Array(width * height);
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let py = 0; py < height; py++) {
      const y = yMax - (py / height) * (yMax - yMin);
      for (let px = 0; px < width; px++) {
        const x = xMin + (px / width) * (xMax - xMin);
        const v = problem.objectiveFn([x, y]);
        const idx = py * width + px;
        values[idx] = v;
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }

    const range = maxVal - minVal || 1;

    // Render subtle contour shading (restrained neutral grayscale with subtle amber tint)
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const idx = py * width + px;
        const norm = Math.sqrt((values[idx] - minVal) / range); // sqrt scale to enhance valley contrast
        const contour = Math.floor(norm * 18); // 18 contour bands
        const isContourLine = (norm * 18) % 1.0 < 0.08;

        const pIdx = idx * 4;
        if (isContourLine) {
          data[pIdx] = 210;     // R
          data[pIdx + 1] = 215; // G
          data[pIdx + 2] = 222; // B
          data[pIdx + 3] = 255;
        } else {
          // Subtle shading: valleys are clean white/light gray, peaks are slightly darker
          const shade = Math.min(252, Math.floor(255 - norm * 35));
          data[pIdx] = shade;
          data[pIdx + 1] = shade;
          data[pIdx + 2] = shade + 2; // subtle cool undertone
          data[pIdx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [problem, xMin, xMax, yMin, yMax]);

  // Movement line pulse animation (strictly visual inside current step)
  useEffect(() => {
    if (!animating) return;
    let animId;
    let start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = (timestamp - start) / 1000;
      setAnimOffset((progress * 24) % 24);
      animId = requestAnimationFrame(step);
    }
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [animating]);

  // Active move details from currentEvent
  const moveInfo = useMemo(() => {
    if (!currentEvent) return null;

    if (currentEvent.phase === 'EMPLOYED' || currentEvent.phase === 'ONLOOKER') {
      if (currentEvent.candidateX && currentEvent.oldX) {
        return {
          type: currentEvent.accepted ? 'accepted' : 'rejected',
          from: currentEvent.oldX,
          to: currentEvent.candidateX,
          dim: currentEvent.dim,
        };
      }
    } else if (currentEvent.type === 'SCOUT_REPLACED' && currentEvent.abandonedSources?.length > 0) {
      const s = currentEvent.abandonedSources[0];
      return {
        type: 'scout',
        from: s.oldX,
        to: s.newX,
      };
    }
    return null;
  }, [currentEvent]);

  // Tick marks for axes
  const xTicks = [xMin, (xMin + xMax) / 2, xMax];
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <div className="plot-container" role="region" aria-label="2D Objective Landscape Plot">
      <div className="plot-header">
        <h3 className="plot-title">
          <span>🎯</span> Objective Landscape &amp; Bee Positions
        </h3>

        <div className="plot-anim-controls">
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Motion Animation:</span>
          <button
            className={`plot-anim-btn${animating ? ' plot-anim-btn--active' : ''}`}
            onClick={() => setAnimating((v) => !v)}
            title="Toggle animated pulse on the active movement vector"
          >
            {animating ? '⏸ Pause Motion' : '▶ Play Motion'}
          </button>
        </div>
      </div>

      <div className="plot-canvas-wrapper">
        {/* Background contour canvas */}
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="plot-canvas-bg"
          aria-hidden="true"
        />

        {/* SVG interactive layer */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="plot-svg-overlay"
          aria-label="Food sources and bee movements plot"
        >
          <defs>
            {/* Arrowhead markers */}
            <marker
              id="arrow-accepted"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 8 4, 0 7" fill="#15803d" />
            </marker>
            <marker
              id="arrow-rejected"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 8 4, 0 7" fill="#b91c1c" />
            </marker>
            <marker
              id="arrow-scout"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 8 4, 0 7" fill="#2563eb" />
            </marker>
          </defs>

          {/* Plot Bounding Box & Axes */}
          <rect
            x={PAD}
            y={PAD}
            width={PLOT_W}
            height={PLOT_H}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />

          {/* Axis Ticks & Labels */}
          {xTicks.map((val, i) => {
            const svgX = toSvgX(val);
            return (
              <g key={`xtick-${i}`}>
                <line
                  x1={svgX}
                  y1={SIZE - PAD}
                  x2={svgX}
                  y2={SIZE - PAD + 5}
                  stroke="var(--color-text-muted)"
                  strokeWidth="1"
                />
                <text
                  x={svgX}
                  y={SIZE - PAD + 18}
                  fontSize="10"
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {yTicks.map((val, i) => {
            const svgY = toSvgY(val);
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={PAD - 5}
                  y1={svgY}
                  x2={PAD}
                  y2={svgY}
                  stroke="var(--color-text-muted)"
                  strokeWidth="1"
                />
                <text
                  x={PAD - 8}
                  y={svgY + 3}
                  fontSize="10"
                  textAnchor="end"
                  fill="var(--color-text-secondary)"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Axis variable labels */}
          <text
            x={PAD + PLOT_W / 2}
            y={SIZE - 4}
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--color-text-primary)"
          >
            {problem.varNames[0]} →
          </text>
          <text
            x={8}
            y={PAD + PLOT_H / 2}
            fontSize="11"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--color-text-primary)"
            transform={`rotate(-90 8 ${PAD + PLOT_H / 2})`}
          >
            ↑ {problem.varNames[1]}
          </text>

          {/* Movement Vector between old and candidate */}
          {moveInfo && (
            <g>
              <line
                x1={toSvgX(moveInfo.from[0])}
                y1={toSvgY(moveInfo.from[1])}
                x2={toSvgX(moveInfo.to[0])}
                y2={toSvgY(moveInfo.to[1])}
                stroke={
                  moveInfo.type === 'accepted'
                    ? '#15803d'
                    : moveInfo.type === 'rejected'
                    ? '#b91c1c'
                    : '#2563eb'
                }
                strokeWidth={moveInfo.type === 'accepted' ? 2.5 : 2}
                strokeDasharray={moveInfo.type === 'accepted' ? 'none' : '4 4'}
                strokeDashoffset={animating ? -animOffset : 0}
                markerEnd={`url(#arrow-${moveInfo.type})`}
              />

              {/* Candidate Location Marker */}
              <g
                transform={`translate(${toSvgX(moveInfo.to[0])}, ${toSvgY(moveInfo.to[1])})`}
              >
                <circle
                  r="7"
                  fill="none"
                  stroke={moveInfo.type === 'accepted' ? '#15803d' : '#b91c1c'}
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
                <text
                  x="0"
                  y="-10"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill={moveInfo.type === 'accepted' ? '#15803d' : '#b91c1c'}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  x' {moveInfo.type === 'accepted' ? '✓' : '✗'}
                </text>
              </g>
            </g>
          )}

          {/* Food Sources */}
          {population.map((src) => {
            const svgX = toSvgX(src.x[0]);
            const svgY = toSvgY(src.x[1]);
            const isActive =
              currentEvent?.sourceId === src.id ||
              currentEvent?.affectedSourceId === src.id;
            const isBest = bestSoFar?.id === src.id;

            return (
              <g
                key={src.id}
                transform={`translate(${svgX}, ${svgY})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSource(src)}
                onMouseLeave={() => setHoveredSource(null)}
              >
                {/* Active bee glow ring */}
                {isActive && (
                  <circle
                    r="14"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="3"
                    opacity="0.8"
                  />
                )}

                {/* Best solution outer ring */}
                {isBest && (
                  <circle
                    r="11"
                    fill="none"
                    stroke="#111111"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Source Node Circle */}
                <circle
                  r={isActive ? 8 : 6}
                  fill={isActive ? 'var(--color-accent)' : '#111111'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Source ID Text */}
                <text
                  x="0"
                  y={isActive ? -12 : -9}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill="#111111"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  #{src.id}
                </text>
              </g>
            );
          })}

          {/* Global Best-so-far Star Marker */}
          {bestSoFar && (
            <g
              transform={`translate(${toSvgX(bestSoFar.x[0])}, ${toSvgY(bestSoFar.x[1])})`}
              pointerEvents="none"
            >
              <text
                x="10"
                y="4"
                fontSize="11"
                fontWeight="bold"
                fill="#855b00"
                fontFamily="'JetBrains Mono', monospace"
              >
                ★ x*
              </text>
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {hoveredSource && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              zIndex: 10,
              background: 'rgba(17, 17, 17, 0.92)',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              pointerEvents: 'none',
            }}
          >
            Source #{hoveredSource.id}: x=[{hoveredSource.x.map((c) => c.toFixed(3)).join(', ')}]
            &nbsp;·&nbsp; f={hoveredSource.f.toFixed(4)} &nbsp;·&nbsp; fit={hoveredSource.fit.toFixed(4)} &nbsp;·&nbsp; t={hoveredSource.t}
          </div>
        )}
      </div>

      {/* Visual Legend */}
      <div className="plot-legend" aria-label="Plot Legend">
        <span className="plot-legend__item">
          <span className="plot-legend__icon" style={{ color: '#111111' }}>●</span>
          Food Source
        </span>
        <span className="plot-legend__item">
          <span className="plot-legend__icon" style={{ color: 'var(--color-accent)' }}>🟡</span>
          Active Bee
        </span>
        <span className="plot-legend__item">
          <span className="plot-legend__icon" style={{ color: '#855b00' }}>★</span>
          Best-so-far (x*)
        </span>
        <span className="plot-legend__item">
          <span className="plot-legend__icon" style={{ color: '#15803d' }}>──→</span>
          Accepted Move
        </span>
        <span className="plot-legend__item">
          <span className="plot-legend__icon" style={{ color: '#b91c1c' }}>- -→</span>
          Rejected Move
        </span>
        <span className="plot-legend__item">
          <span className="plot-legend__icon" style={{ color: '#2563eb' }}>⇢</span>
          Scout Replacement
        </span>
      </div>
    </div>
  );
}
