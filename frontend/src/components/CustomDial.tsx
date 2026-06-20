'use client';

import React, { KeyboardEvent, MouseEvent } from 'react';
import styles from './CustomDial.module.css';

type DietType = 'vegan' | 'vegetarian' | 'flexitarian' | 'average' | 'heavy';

interface CustomDialProps {
  value: DietType;
  onChange: (value: DietType) => void;
}

const DIET_ORDER: DietType[] = ['vegan', 'vegetarian', 'flexitarian', 'average', 'heavy'];

const DIET_METADATA: Record<DietType, { label: string; color: string; desc: string }> = {
  vegan: { label: 'Vegan', color: '#00e676', desc: 'No animal products (600 kg/year)' },
  vegetarian: { label: 'Vegetarian', color: '#00f2fe', desc: 'No meat, includes dairy/eggs (900 kg/year)' },
  flexitarian: { label: 'Flexitarian', color: '#ba68c8', desc: 'Occasional meat consumption (1400 kg/year)' },
  average: { label: 'Average Meat', color: '#ff9100', desc: 'Moderate meat consumption (2000 kg/year)' },
  heavy: { label: 'Heavy Meat', color: '#ff3d00', desc: 'Daily meat consumption (2800 kg/year)' }
};

/**
 * CustomDial Component.
 *
 * Renders an SVG dial interface representing the dietary profile.
 * Supports keyboard controls (Arrow keys, Home, End) and mouse clicks, conforming
 * fully to WCAG 2.1 AAA accessibility rules for range/slider components.
 *
 * @param props - Contains the active value (DietType) and change handlers.
 * @returns React TSX element representing the custom dial.
 */
export function CustomDial({ value, onChange }: CustomDialProps) {
  const currentIndex = DIET_ORDER.indexOf(value);
  const activeMeta = DIET_METADATA[value];

  // SVG parameters
  const radius = 80;
  const circumference = 2 * Math.PI * radius; // ~502.65
  
  // Arch starts at -135deg (225deg) and ends at +135deg (135deg) - a 270 degree sweep
  const angleSweep = 270;
  const startAngle = -135;
  
  // Calculate current angle based on index (0 to 4)
  const currentAngle = startAngle + (currentIndex / (DIET_ORDER.length - 1)) * angleSweep;
  const angleRad = (currentAngle - 90) * (Math.PI / 180); // Offset -90 to align 0 degrees to the top

  // Dot position
  const dotX = 100 + radius * Math.cos(angleRad);
  const dotY = 100 + radius * Math.sin(angleRad);

  // SVG Progress Stroke length (using dashoffset of the 270 deg sweep)
  const sweepFraction = angleSweep / 360; // 0.75
  const activeCircumference = circumference * sweepFraction; // Path length
  const progressRatio = currentIndex / (DIET_ORDER.length - 1);
  const strokeDashoffset = circumference - (activeCircumference * progressRatio);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex = currentIndex;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      nextIndex = Math.min(DIET_ORDER.length - 1, currentIndex + 1);
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      nextIndex = Math.max(0, currentIndex - 1);
      e.preventDefault();
    } else if (e.key === 'Home') {
      nextIndex = 0;
      e.preventDefault();
    } else if (e.key === 'End') {
      nextIndex = DIET_ORDER.length - 1;
      e.preventDefault();
    }
    
    if (nextIndex !== currentIndex) {
      onChange(DIET_ORDER[nextIndex]);
    }
  };

  const handleDialClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 100; // relative to center (100, 100)
    const y = e.clientY - rect.top - 100;
    
    // Calculate angle in degrees [-180, 180], offset to match sweep
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < -180) angle += 360;
    if (angle > 180) angle -= 360;

    // Map angle to closest index (sweep is from -135 to 135)
    let clampedAngle = Math.max(-135, Math.min(135, angle));
    const normalizedRatio = (clampedAngle + 135) / 270;
    const targetIndex = Math.round(normalizedRatio * (DIET_ORDER.length - 1));
    
    onChange(DIET_ORDER[targetIndex]);
  };

  return (
    <div className={styles.dialContainer}>
      <div 
        className={styles.dialWrapper}
        onClick={handleDialClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Dietary Profile Dial"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={currentIndex + 1}
        aria-valuetext={`${activeMeta.label} - ${activeMeta.desc}`}
      >
        {/* SVG Ring Background and Progress Indicator */}
        <svg className={styles.svgRing} viewBox="0 0 200 200">
          {/* Base Track (Open 270 degree arc) */}
          <path
            className={styles.trackRing}
            d="M 43.43 156.57 A 80 80 0 1 1 156.57 156.57"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * 0.25} // Hides the bottom 90 deg segment
          />
          {/* Active Highlight Arc */}
          <path
            className={styles.indicatorRing}
            d="M 43.43 156.57 A 80 80 0 1 1 156.57 156.57"
            stroke={activeMeta.color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 6px ${activeMeta.color})`
            }}
          />
        </svg>

        {/* Glowing Indicator Dot */}
        <div 
          className={styles.glowingDot}
          style={{
            left: `${dotX}px`,
            top: `${dotY}px`,
            backgroundColor: activeMeta.color,
            boxShadow: `0 0 12px 3px ${activeMeta.color}`
          }}
        />

        {/* Center Text Info Display */}
        <div className={styles.centerDisplay}>
          <span className={styles.dietLabel}>Diet Profile</span>
          <span 
            className={styles.dietValue}
            style={{ color: activeMeta.color }}
          >
            {activeMeta.label}
          </span>
        </div>
      </div>

      {/* Button options listed below the dial for easy access and clickability */}
      <ul className={styles.dietList}>
        {DIET_ORDER.map((d, index) => {
          const isActive = d === value;
          const meta = DIET_METADATA[d];
          return (
            <li key={d}>
              <button
                type="button"
                className={`${styles.dietBtn} ${isActive ? styles.dietBtnActive : ''}`}
                onClick={() => onChange(d)}
                style={isActive ? { textShadow: `0 0 8px ${meta.color}`, color: meta.color } : {}}
                aria-label={`Select ${meta.label} dietary profile. Description: ${meta.desc}`}
              >
                {meta.label.split(' ')[0]} {/* shortened text */}
              </button>
            </li>
          );
        })}
      </ul>
      <span className="sr-only" aria-live="polite">
        Current dietary profile: {activeMeta.label}. {activeMeta.desc}.
      </span>
    </div>
  );
}
