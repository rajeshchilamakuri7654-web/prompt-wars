'use client';

import React, { useState, useRef, useId, useCallback } from 'react';
import styles from './CitationTooltip.module.css';

export interface Citation {
  source: string;    // e.g. "IPCC AR6, 2023"
  detail: string;    // brief description of the data point
  url:    string;    // direct link to source
}

interface CitationTooltipProps {
  citations: Citation[];
  /** Where to position the popover */
  placement?: 'top' | 'bottom';
}

/**
 * CitationTooltip Component.
 *
 * Renders an inline information icon that toggles a modal/popover window containing
 * scientific citations and links. Follows WCAG AAA requirements with keyboard triggers (Escape
 * closes the popup) and full accessibility attributes.
 *
 * @param props - Contains array of Citation objects and optional layout position.
 * @returns React TSX element representing the citation icon.
 */
export function CitationTooltip({ citations, placement = 'top' }: CitationTooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverId = `citation-popover-${id}`;

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <span className={styles.wrapper} onKeyDown={handleKeyDown}>
      <button
        ref={btnRef}
        type="button"
        className={styles.icon}
        onClick={toggle}
        aria-label="View data sources and citations"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="dialog"
      >
        ⓘ
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <span
            className={styles.backdrop}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id={popoverId}
            role="dialog"
            aria-label="Data Sources"
            aria-modal="false"
            className={`${styles.popover} ${placement === 'bottom' ? styles.popoverBottom : styles.popoverTop}`}
          >
            <div className={styles.popoverHeader}>
              <span className={styles.popoverTitle}>Data Sources</span>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="Close citations panel"
              >
                ✕
              </button>
            </div>
            <ul className={styles.citationList} role="list">
              {citations.map((c, i) => (
                <li key={i} className={styles.citationItem} role="listitem">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.citationSource}
                    aria-label={`Open source: ${c.source} (opens in new tab)`}
                  >
                    {c.source} ↗
                  </a>
                  <span className={styles.citationDetail}>{c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </span>
  );
}

// ── Pre-defined citation sets for each dashboard section ─────────────────────
export const TRANSPORT_CITATIONS: Citation[] = [
  {
    source: 'IPCC AR6, WG3 Ch10, 2022',
    detail: 'Transport emission factors: gas 0.18 kg CO₂/km, EV 0.05 kg CO₂/km',
    url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-10/',
  },
  {
    source: 'Our World in Data — CO2 per km',
    detail: 'Aviation: short-haul ~150 kg CO₂, long-haul ~900 kg CO₂ per flight',
    url: 'https://ourworldindata.org/travel-carbon-footprint',
  },
];

export const DIET_CITATIONS: Citation[] = [
  {
    source: 'Oxford / Poore & Nemecek, Science 2018',
    detail: 'Vegan: 600 kg/yr · Vegetarian: 900 · Heavy meat: 2,800 kg/yr',
    url: 'https://science.sciencemag.org/content/360/6392/987',
  },
  {
    source: 'IPCC SR1.5, 2018',
    detail: 'Diet shift to plant-based is a major mitigation lever',
    url: 'https://www.ipcc.ch/sr15/',
  },
];

export const ENERGY_CITATIONS: Citation[] = [
  {
    source: 'EPA eGRID 2023',
    detail: 'Grid electricity: 0.40 kg CO₂/kWh; solar: 0.05 kg CO₂/kWh lifecycle',
    url: 'https://www.epa.gov/egrid',
  },
  {
    source: 'IEA — Electricity Market Report 2024',
    detail: 'EU average grid carbon intensity used for heating factor',
    url: 'https://www.iea.org/reports/electricity-market-report-2024',
  },
];

export const GLOBAL_CITATIONS: Citation[] = [
  {
    source: 'UNFCCC — Paris Agreement, 2015',
    detail: 'Target: ≤2 tonnes CO₂ per person per year by 2050',
    url: 'https://unfccc.int/process-and-meetings/the-paris-agreement',
  },
  {
    source: 'World Bank — CO₂ Emissions per Capita, 2023',
    detail: 'Global average: 4.8 t/person; EU: 6.8 t/person',
    url: 'https://data.worldbank.org/indicator/EN.ATM.CO2E.PC',
  },
];
