'use client';

import React, { useState, useCallback } from 'react';
import { Hourglass } from 'lucide-react';
import styles from './TimeTravelPanel.module.css';
import type { CarbonInput } from '../hooks/useCarbonWS';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface YearProjection {
  year:             number;
  totalKg:          number;
  cumulativeTonnes: number;
  percentageDelta:  number;
  treesNeeded:      number;
}

interface TimeTravelResult {
  baseline: { total: number };
  projections: {
    oneYear:  YearProjection;
    fiveYear: YearProjection;
    tenYear:  YearProjection;
  };
  summary: string;
}

interface TimeTravelPanelProps {
  inputs: CarbonInput;
}

function DeltaBadge({ delta }: { delta: number }) {
  const isPositive = delta >= 0;
  return (
    <span className={`${styles.delta} ${isPositive ? styles.deltaPositive : styles.deltaNegative}`}>
      {isPositive ? '+' : ''}{delta}%
    </span>
  );
}

interface ProjectionRowProps {
  label:      string;
  projection: YearProjection;
  maxKg:      number;
  barClass:   string;
}

function ProjectionRow({ label, projection, maxKg, barClass }: ProjectionRowProps) {
  const barWidth = Math.min(100, (projection.totalKg / maxKg) * 100);
  return (
    <article className={styles.projectionRow} aria-label={`${label} projection`}>
      <div className={styles.rowHeader}>
        <div>
          <span className={styles.rowLabel}>{label} ({projection.year})</span>
          <p className={styles.rowMeta}>
            {projection.cumulativeTonnes}t cumulative · {projection.treesNeeded} trees/yr to offset
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className={styles.rowValue}
            aria-label={`${Math.round(projection.totalKg).toLocaleString()} kilograms of CO2 per year`}
          >
            {Math.round(projection.totalKg).toLocaleString()}
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginLeft: 4 }}>kg/yr</span>
          </span>
          <DeltaBadge delta={projection.percentageDelta} />
        </div>
      </div>
      <div
        className={styles.barTrack}
        role="meter"
        aria-valuenow={Math.round(projection.totalKg)}
        aria-valuemin={0}
        aria-valuemax={Math.round(maxKg)}
        aria-label={`${label} footprint bar`}
      >
        <div
          className={`${styles.barFill} ${barClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </article>
  );
}

/**
 * TimeTravelPanel Component.
 *
 * Renders the interactive multi-year carbon projection cards. Extrapolates
 * emissions over 1, 5, and 10-year periods using compounding formulas driven by
 * grid decarbonization rates and user behavior settings.
 *
 * @param props - Contains the active user input variables.
 * @returns React TSX element representing the projection panel.
 */
export function TimeTravelPanel({ inputs }: TimeTravelPanelProps) {
  const [result,  setResult]  = useState<TimeTravelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchProjection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/project`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(inputs),
      });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setResult(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [inputs]);

  // Determine the maximum kg for proportional bar rendering
  const maxKg = result
    ? Math.max(
        result.projections.oneYear.totalKg,
        result.projections.fiveYear.totalKg,
        result.projections.tenYear.totalKg,
        result.baseline.total,
      )
    : 1;

  return (
    <section className={styles.panel} aria-labelledby="timetravel-title">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 id="timetravel-title" className={styles.title}>
            Time-Travel Projection
          </h2>
          <p className={styles.subtitle}>
            Your footprint extrapolated 1, 5 &amp; 10 years into the future
          </p>
        </div>
        <button
          type="button"
          className={styles.fetchBtn}
          onClick={fetchProjection}
          disabled={loading}
          aria-label="Run time-travel projection based on current inputs"
        >
          {loading ? 'Computing…' : '⏱ Project Future'}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div aria-busy="true" aria-live="polite">
          <div className={styles.skeleton} aria-hidden="true" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <p role="alert" style={{ color: 'hsl(var(--accent-red))', fontSize: '0.85rem' }}>
          ⚠ {error}
        </p>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          <div className={styles.projectionList}>
            <ProjectionRow
              label="1 Year"
              projection={result.projections.oneYear}
              maxKg={maxKg}
              barClass={styles.barFill1yr}
            />
            <ProjectionRow
              label="5 Years"
              projection={result.projections.fiveYear}
              maxKg={maxKg}
              barClass={styles.barFill5yr}
            />
            <ProjectionRow
              label="10 Years"
              projection={result.projections.tenYear}
              maxKg={maxKg}
              barClass={styles.barFill10yr}
            />
          </div>
          <p className={styles.summaryStrip} aria-live="polite">
            {result.summary}
          </p>
        </>
      )}

      {/* Initial prompt */}
      {!result && !loading && !error && (
        <div className={styles.emptyState}>
          <Hourglass size={18} style={{ marginBottom: 8, opacity: 0.5 }} aria-hidden="true" />
          <p>Hit <strong>Project Future</strong> to see where your habits take the planet.</p>
        </div>
      )}
    </section>
  );
}
