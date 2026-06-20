'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './DebtClock.module.css';

interface DebtClockProps {
  /** Annual CO2 score in kg/year — drives the ticker rate */
  annualKg: number;
}

/** Seconds in a year (365.25 days for accuracy) */
const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60; // 31,557,600

/**
 * DebtClock Component.
 *
 * Renders a high-precision, real-time live carbon emission ticker. Uses RequestAnimationFrame
 * to update displaying decimals dynamically based on the current annual emission rate (kg/year).
 *
 * Designed with accessibility overrides (aria-live="off" to prevent screen-reader spam on rapid ticks).
 *
 * @param props - Element properties containing the active user's annual carbon footprint.
 * @returns React TSX element representing the ticking clock widget.
 */
export function DebtClock({ annualKg }: DebtClockProps) {
  const startTimeRef    = useRef<number>(Date.now());
  const rafRef          = useRef<number | null>(null);
  const annualKgRef     = useRef(annualKg);

  const [totalDisplay,   setTotalDisplay]   = useState('0.0000');
  const [sessionDisplay, setSessionDisplay] = useState('0.0000');

  // Keep annualKg ref in sync — the rAF loop always reads the latest value
  // without needing to restart the animation loop on every prop change.
  useEffect(() => {
    annualKgRef.current = annualKg;
  }, [annualKg]);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      const rate           = annualKgRef.current / SECONDS_PER_YEAR; // kg per second

      // Session accrual: how much emitted since this page was loaded
      const sessionKg = rate * elapsedSeconds;

      // Annualised live total: start from the base score and add what's ticking
      const liveTotal = annualKgRef.current + sessionKg;

      setTotalDisplay(liveTotal.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }));

      setSessionDisplay(sessionKg.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }));

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []); // Only mount once — annualKg changes are handled via ref

  return (
    <div
      className={styles.widget}
      role="status"
      aria-live="off"           /* suppress SR flood — purely decorative ticker */
      aria-label={`Live carbon debt clock. Current annual rate: ${Math.round(annualKg)} kilograms of CO2 per year.`}
    >
      <div className={styles.label}>
        <span className={styles.dot} aria-hidden="true" />
        Live Carbon Emissions
      </div>

      <div className={styles.ticker} aria-hidden="true">
        {totalDisplay}
        <span className={styles.tickerUnit}>kg CO₂</span>
      </div>

      <div className={styles.sublabel}>
        Projected annual footprint, accumulating in real time
      </div>

      <div className={styles.sessionAccrued} aria-hidden="true">
        +{sessionDisplay} kg emitted this session
      </div>
    </div>
  );
}
