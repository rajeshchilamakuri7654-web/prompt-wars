'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './Dashboard.module.css';
import { useCarbonWS } from '../hooks/useCarbonWS';
import { CategoryCard } from './CategoryCard';
import { CustomDial } from './CustomDial';
import dynamic from 'next/dynamic';

const ThreeCanvas = dynamic(
  () => import('./ThreeCanvas').then((mod) => mod.ThreeCanvas),
  {
    ssr: false,
    loading: () => (
      <div 
        className={styles.canvasPlaceholder} 
        role="img" 
        aria-label="3D Eco-Orb Loading..."
      >
        <div className={styles.placeholderGlow} />
      </div>
    ),
  }
);
import { ReductionSimulator } from './ReductionSimulator';
import { TimeTravelPanel } from './TimeTravelPanel';
import { EcoAvatar } from './EcoAvatar';
import { DebtClock } from './DebtClock';
import { GlobalComparison } from './GlobalComparison';
import { OffsetPanel } from './OffsetPanel';
import { CitationTooltip, TRANSPORT_CITATIONS, DIET_CITATIONS, ENERGY_CITATIONS } from './CitationTooltip';
import { useConfetti } from '../hooks/useConfetti';
import { Car, Home, Salad, ShieldAlert } from 'lucide-react';

export function Dashboard() {
  const { inputs, result, connectionStatus, errorMsg, updateInputs } = useCarbonWS();
  
  // Simulation Preview State
  const [activeSimId, setActiveSimId] = useState<string | null>(null);
  const [simulatedSavings, setSimulatedSavings] = useState(0);

  // Burst counter — increment to trigger Three.js celebration explosion
  const [burstTrigger, setBurstTrigger] = useState(0);
  const prevCommuteModeRef = useRef(inputs.commuteMode);

  // Detect when user switches to a lower-emission commute mode
  useEffect(() => {
    const HIGH_EMISSION  = ['gas'] as const;
    const LOW_EMISSION   = ['bike', 'transit', 'ev'] as const;
    const wasHigh = (HIGH_EMISSION as readonly string[]).includes(prevCommuteModeRef.current);
    const isLow   = (LOW_EMISSION  as readonly string[]).includes(inputs.commuteMode);
    if (wasHigh && isLow) {
      setBurstTrigger((n) => n + 1);
    }
    prevCommuteModeRef.current = inputs.commuteMode;
  }, [inputs.commuteMode]);

  const handleToggleSim = (simId: string | null, savings: number) => {
    setActiveSimId(simId);
    setSimulatedSavings(savings);
  };

  // Base metrics
  const originalScore = result?.total ?? 4320; // default loading placeholder
  const activeScore = activeSimId ? Math.max(0, originalScore - simulatedSavings) : originalScore;

  // ── Confetti fires when score drops below Paris target (2,000 kg)
  useConfetti(activeScore);

  // Determine carbon tier rating
  const getRating = (score: number) => {
    if (score < 2000) return { label: 'Excellent (Low)', class: styles.ratingExcellent };
    if (score <= 5000) return { label: 'Moderate', class: styles.ratingModerate };
    return { label: 'High Impact', class: styles.ratingHigh };
  };

  const rating = getRating(activeScore);

  // Status Indicator Mapping
  const getStatusPill = () => {
    switch (connectionStatus) {
      case 'connecting':
        return (
          <div className={styles.statusBar}>
            <span className={`${styles.statusDot} ${styles.dotConnecting}`} />
            <span>CONNECTING SYNC LAYER</span>
          </div>
        );
      case 'connected':
        return (
          <div className={styles.statusBar}>
            <span className={`${styles.statusDot} ${styles.dotConnected}`} />
            <span>REAL-TIME STREAM SYNCED (WS)</span>
          </div>
        );
      case 'fallback':
        return (
          <div className={styles.statusBar}>
            <span className={`${styles.statusDot} ${styles.dotFallback}`} />
            <span>REST API METRIC FALLBACK (HTTP)</span>
          </div>
        );
      default:
        return (
          <div className={styles.statusBar}>
            <span className={`${styles.statusDot} ${styles.dotError}`} />
            <span>SYNC CONNECTION OFFLINE</span>
          </div>
        );
    }
  };

  return (
    <main className={styles.container}>
      {/* Upper Navigation / Status bar */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Aetheria Carbon</h1>
          <p className={styles.tagline}>Weightless, real-time carbon simulation & WebGL visualization</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Live debt clock widget in header */}
          <DebtClock annualKg={activeScore} />
          {getStatusPill()}
        </div>
      </header>

      {/* Error notification bar if server is fully offline */}
      {errorMsg && (
        <div className={styles.alertBar} role="alert">
          <ShieldAlert size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid Dashboard */}
      <div className={styles.dashboardGrid}>
        
        {/* Left Column: Transport Inputs */}
        <div className={styles.sidebarCol}>
          <CategoryCard title="Transport Profile" icon={<Car size={18} />}>
            {/* Commute Mode Select */}
            <div className={styles.formGroup}>
              <label className={styles.inputLabel} id="commute-mode-label">
                Commute Mode
                <CitationTooltip citations={TRANSPORT_CITATIONS} />
              </label>
              <div 
                className={styles.segmentedControl} 
                role="radiogroup" 
                aria-labelledby="commute-mode-label"
              >
                {(['gas', 'ev', 'transit', 'bike'] as const).map((mode) => {
                  const isActive = inputs.commuteMode === mode;
                  const labelMap = { gas: 'Gas Car', ev: 'EV', transit: 'Transit', bike: 'Bike' };
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`${styles.segmentBtn} ${isActive ? styles.segmentBtnActive : ''}`}
                      onClick={() => updateInputs({ commuteMode: mode })}
                    >
                      {labelMap[mode]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Distance Slider */}
            <div className={styles.formGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="distance-slider" className={styles.inputLabel}>Daily Commute</label>
                <span className={styles.valueIndicator}>{inputs.dailyDistance} km</span>
              </div>
              <div className={styles.sliderWrapper}>
                <input
                  id="distance-slider"
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  className={styles.rangeSlider}
                  value={inputs.dailyDistance}
                  onChange={(e) => updateInputs({ dailyDistance: Number(e.target.value) })}
                  aria-valuemin={0}
                  aria-valuemax={200}
                  aria-valuenow={inputs.dailyDistance}
                  aria-valuetext={`${inputs.dailyDistance} kilometers per day`}
                />
              </div>
            </div>

            {/* Air Travel Counters */}
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Annual Flights</label>
              <div className={styles.counterGrid}>
                {/* Short haul flight counter */}
                <div className={styles.counterBox}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>Short-Haul</span>
                    <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))' }}>&lt; 3 hours</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={styles.counterBtn}
                      onClick={() => updateInputs({ shortHaulFlights: Math.max(0, inputs.shortHaulFlights - 1) })}
                      aria-label="Decrease short-haul flights"
                    >
                      -
                    </button>
                    <span className={styles.counterValue} aria-live="polite">{inputs.shortHaulFlights}</span>
                    <button
                      type="button"
                      className={styles.counterBtn}
                      onClick={() => updateInputs({ shortHaulFlights: Math.min(50, inputs.shortHaulFlights + 1) })}
                      aria-label="Increase short-haul flights"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Long haul flight counter */}
                <div className={styles.counterBox}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>Long-Haul</span>
                    <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))' }}>&gt; 3 hours</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={styles.counterBtn}
                      onClick={() => updateInputs({ longHaulFlights: Math.max(0, inputs.longHaulFlights - 1) })}
                      aria-label="Decrease long-haul flights"
                    >
                      -
                    </button>
                    <span className={styles.counterValue} aria-live="polite">{inputs.longHaulFlights}</span>
                    <button
                      type="button"
                      className={styles.counterBtn}
                      onClick={() => updateInputs({ longHaulFlights: Math.min(50, inputs.longHaulFlights + 1) })}
                      aria-label="Increase long-haul flights"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CategoryCard>
        </div>

        {/* Center Column: 3D Visualization Canvas & Main Metric display */}
        <div className={styles.centerCol}>
          <div className={styles.canvasContainer}>
            <ThreeCanvas score={activeScore} burstTrigger={burstTrigger} />
          </div>

          <div className={styles.metricOverlay}>
            <span className={styles.totalLabel}>
              {activeSimId ? 'Simulated Footprint' : 'Total CO2 Footprint'}
            </span>
            <div className={styles.totalValueContainer}>
              {activeSimId && (
                <span className={styles.originalValue}>
                  {Math.round(originalScore).toLocaleString()}
                </span>
              )}
              <span className={`${styles.totalValue} ${activeSimId ? styles.simulatedValue : ''}`}>
                {Math.round(activeScore).toLocaleString()}
              </span>
              <span className={styles.totalUnit}>kg/year</span>
            </div>
            <span className={`${styles.ratingBadge} ${rating.class}`}>
              {rating.label}
            </span>
          </div>
        </div>

        {/* Right Column: Dietary Dial & Energy Toggles */}
        <div className={styles.sidebarCol}>
          <CategoryCard title="Dietary Profile" icon={<Salad size={18} />}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                Profile dial
              </span>
              <CitationTooltip citations={DIET_CITATIONS} placement="bottom" />
            </div>
            <CustomDial 
              value={inputs.dietaryProfile}
              onChange={(diet) => updateInputs({ dietaryProfile: diet })}
            />
          </CategoryCard>

          <CategoryCard title="Home Energy" icon={<Home size={18} />}>
            {/* Housing Type Selection */}
            <div className={styles.formGroup}>
              <label className={styles.inputLabel} id="housing-type-label">
                Housing Type
                <CitationTooltip citations={ENERGY_CITATIONS} placement="bottom" />
              </label>
              <div 
                className={styles.segmentedControl} 
                role="radiogroup" 
                aria-labelledby="housing-type-label"
              >
                {(['apartment', 'semi-detached', 'detached'] as const).map((type) => {
                  const isActive = inputs.housingType === type;
                  const labelMap = { apartment: 'Apartment', 'semi-detached': 'Semi-Det.', detached: 'Detached' };
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`${styles.segmentBtn} ${isActive ? styles.segmentBtnActive : ''}`}
                      onClick={() => updateInputs({ housingType: type })}
                    >
                      {labelMap[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Power Source Toggle (Grid vs Solar) */}
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Power Grid Source</label>
              <button
                type="button"
                className={styles.toggleRow}
                onClick={() => updateInputs({ powerSource: inputs.powerSource === 'grid' ? 'solar' : 'grid' })}
                role="switch"
                aria-checked={inputs.powerSource === 'solar'}
                aria-label={`Toggle power grid source. Current: ${inputs.powerSource === 'solar' ? 'Renewable Solar' : 'Standard Utility Grid'}`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span className={styles.toggleStateLabel} style={{ color: inputs.powerSource === 'solar' ? 'hsl(var(--accent-cyan))' : 'white' }}>
                    {inputs.powerSource === 'solar' ? 'Renewable Solar' : 'Utility Grid'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>
                    {inputs.powerSource === 'solar' ? '50% offset applied' : 'Standard grid rates'}
                  </span>
                </div>
                <div className={`${styles.switch} ${inputs.powerSource === 'solar' ? styles.switchActive : ''}`}>
                  <div className={`${styles.handle} ${inputs.powerSource === 'solar' ? styles.handleActive : ''}`} />
                </div>
              </button>
            </div>
          </CategoryCard>
        </div>

      </div>

      {/* Habits Simulator panel (full width) */}
      <ReductionSimulator 
        simulations={result?.simulation}
        onToggleSim={handleToggleSim}
      />

      {/* ── Row: Global Comparison Gauge + Offset Marketplace ───────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        <GlobalComparison score={activeScore} />
        <OffsetPanel annualKg={activeScore} />
      </div>

      {/* ── Row: Time-Travel Projection + Eco-Avatar ───────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        <TimeTravelPanel inputs={inputs} />
        <EcoAvatar />
      </div>
    </main>
  );
}
