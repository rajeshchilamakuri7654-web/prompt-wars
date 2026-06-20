'use client';

import React, { useMemo } from 'react';
import styles from './GlobalComparison.module.css';

interface GlobalComparisonProps {
  /** User's annual CO2 footprint in kg/year */
  score: number;
}

// ── Global reference milestones (kg CO2/year per person) ──────────────────────
const MILESTONES = [
  { key: 'paris',  label: 'Paris Target',  value: 2300,  color: '#00e676' },
  { key: 'world',  label: 'World Average', value: 4800,  color: '#00f2fe' },
  { key: 'eu',     label: 'EU Average',    value: 6800,  color: '#ba68c8' },
] as const;

// ── SVG arc helpers ───────────────────────────────────────────────────────────
const CX      = 140;
const CY      = 130; // SVG viewBox centre
const R       = 100; // arc radius
const ARC_MIN = 180; // degrees (left)
const ARC_MAX = 0;   // degrees (right)
const MAX_KG  = 10000;

/** Convert a kg value (0–MAX_KG) to a degree on the arc (180°→0°) */
function kgToDeg(kg: number): number {
  const clamped = Math.min(MAX_KG, Math.max(0, kg));
  return ARC_MIN - (clamped / MAX_KG) * ARC_MIN;
}

/** Convert polar angle (degrees from 3-o'clock) to SVG (x,y) */
function polarToXY(deg: number, r: number): { x: number; y: number } {
  const rad = ((deg - 180) * Math.PI) / 180;
  return {
    x: CX + r * Math.cos(rad),
    y: CY + r * Math.sin(rad),
  };
}

/** Generate an SVG arc path from startDeg → endDeg */
function arcPath(startDeg: number, endDeg: number, r: number): string {
  const start   = polarToXY(startDeg, r);
  const end     = polarToXY(endDeg, r);
  const large   = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

/**
 * GlobalComparison Component.
 *
 * Renders an SVG-based semi-circular gauge displaying the user's carbon footprint
 * relative to core climate action and policy milestones: the Paris Agreement target (2.3t),
 * the Global Average (4.8t), and the European Union Average (6.8t).
 *
 * Uses accessibility tags (aria-live, role="img", aria-label) to support screen-readers,
 * and renders responsive SVG nodes.
 *
 * @param props - Element properties mapping user's current annual footprint score.
 * @returns React TSX element representing the gauge component.
 */
export function GlobalComparison({ score }: GlobalComparisonProps) {
  const userDeg = useMemo(() => kgToDeg(score), [score]);

  // Colour the score arc: green < Paris, orange < World, red above
  const scoreColor =
    score <= 2300 ? '#00e676' :
    score <= 4800 ? '#00f2fe' :
    score <= 6800 ? '#ba68c8' : '#ff3d00';

  // Verdict text
  const verdict =
    score <= 2300 ? { text: '✓ Below Paris Agreement Target', cls: styles.verdictBelow } :
    score <= 4800 ? { text: '↑ Above Paris — Below World Average', cls: styles.verdictAbove } :
    score <= 6800 ? { text: '↑↑ Above World Average', cls: styles.verdictAbove } :
    { text: '⚠ Exceeds EU Average — High Impact Zone', cls: styles.verdictHigh };

  const milestoneMarkers = MILESTONES.map((m) => {
    const deg  = kgToDeg(m.value);
    const tick = polarToXY(deg, R + 10);
    const lbl  = polarToXY(deg, R + 22);
    return { ...m, deg, tick, lbl };
  });

  // Needle tip position
  const needle = polarToXY(userDeg, R - 12);

  return (
    <section className={styles.panel} aria-labelledby="gc-title">
      <div className={styles.header}>
        <h2 id="gc-title" className={styles.title}>Global Comparison</h2>
        <p className={styles.subtitle}>
          Your footprint mapped against global milestones
        </p>
      </div>

      <div className={styles.gaugeWrapper}>
        <svg
          viewBox="0 0 280 150"
          className={styles.gaugeSvg}
          aria-label={`Arc gauge. Your score ${Math.round(score).toLocaleString()} kg versus Paris target 2300, World average 4800, EU average 6800`}
          role="img"
        >
          {/* Background arc — full range */}
          <path
            d={arcPath(180, 0, R)}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Coloured score arc — 180° → userDeg */}
          <path
            d={arcPath(180, 180 - (score / MAX_KG) * 180, R)}
            fill="none"
            stroke={scoreColor}
            strokeWidth="12"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${scoreColor}88)`, transition: 'all 0.6s ease' }}
          />

          {/* Milestone tick marks */}
          {milestoneMarkers.map((m) => {
            const inner = polarToXY(m.deg, R - 7);
            const outer = polarToXY(m.deg, R + 7);
            return (
              <g key={m.key}>
                <line
                  x1={inner.x} y1={inner.y}
                  x2={outer.x} y2={outer.y}
                  stroke={m.color} strokeWidth="2" opacity="0.8"
                />
              </g>
            );
          })}

          {/* Needle */}
          <line
            x1={CX} y1={CY}
            x2={needle.x} y2={needle.y}
            stroke="white" strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)' }}
          />
          <circle cx={CX} cy={CY} r="5" fill="white" />

          {/* Milestone labels — Paris & EU only (to avoid clutter) */}
          <text
            x={polarToXY(kgToDeg(2300), R + 26).x}
            y={polarToXY(kgToDeg(2300), R + 26).y}
            fill="#00e676" fontSize="7" textAnchor="middle" fontWeight="700"
          >
            Paris
          </text>
          <text
            x={polarToXY(kgToDeg(4800), R + 26).x}
            y={polarToXY(kgToDeg(4800), R + 26).y}
            fill="#00f2fe" fontSize="7" textAnchor="middle" fontWeight="700"
          >
            World
          </text>
          <text
            x={polarToXY(kgToDeg(6800), R + 26).x}
            y={polarToXY(kgToDeg(6800), R + 26).y}
            fill="#ba68c8" fontSize="7" textAnchor="middle" fontWeight="700"
          >
            EU
          </text>

          {/* Min/Max labels */}
          <text x="20" y="138" fill="rgba(255,255,255,0.3)" fontSize="7">0</text>
          <text x="244" y="138" fill="rgba(255,255,255,0.3)" fontSize="7">10k</text>
        </svg>

        <div className={styles.scoreReadout}>
          <span
            className={styles.scoreNumber}
            style={{ color: scoreColor }}
            aria-live="polite"
            aria-atomic="true"
          >
            {Math.round(score).toLocaleString()}
            <span className={styles.scoreUnit}>kg/yr</span>
          </span>
        </div>
      </div>

      {/* Milestone legend bars */}
      <div className={styles.legendList} role="list" aria-label="Milestone comparisons">
        {MILESTONES.map((m) => {
          const userPct = Math.min(100, (score / m.value) * 100);
          return (
            <div key={m.key} className={styles.legendItem} role="listitem">
              <span className={styles.legendDot} style={{ background: m.color }} aria-hidden="true" />
              <span className={styles.legendLabel}>{m.label}</span>
              <div className={styles.legendBar} aria-hidden="true">
                <div
                  className={styles.legendBarFill}
                  style={{ width: `${Math.min(100, (m.value / MAX_KG) * 100)}%`, background: m.color, opacity: 0.4 }}
                />
                <div
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${Math.min(100, (score / MAX_KG) * 100)}%`,
                    height: '100%', borderRadius: 2,
                    background: scoreColor,
                    transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
              <span className={styles.legendValue}>{m.value.toLocaleString()} kg</span>
            </div>
          );
        })}
      </div>

      <div className={`${styles.verdict} ${verdict.cls}`} role="status" aria-live="polite">
        {verdict.text}
      </div>
    </section>
  );
}
