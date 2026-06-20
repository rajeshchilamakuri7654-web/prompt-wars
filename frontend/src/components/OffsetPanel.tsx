'use client';

import React, { useMemo } from 'react';
import { Leaf } from 'lucide-react';
import styles from './OffsetPanel.module.css';
import { CitationTooltip, GLOBAL_CITATIONS } from './CitationTooltip';

interface OffsetPanelProps {
  /** User's annual carbon footprint in kg/year */
  annualKg: number;
}

// ── Vetted real-world carbon offset projects ─────────────────────────────────
const OFFSET_PROJECTS = [
  {
    emoji:       '🌳',
    name:        'Amazon Rainforest Conservation',
    meta:        'REDD+ deforestation prevention · Brazil · Gold Standard',
    badge:       'Gold Standard',
    badgeClass:  'badgeGold' as const,
    pricePerTonne: 8,   // USD
    url:         'https://www.southpole.com/carbon-credits/protecting-the-amazon',
  },
  {
    emoji:       '💨',
    name:        'Indian Wind Energy Project',
    meta:        'Renewable energy · Rajasthan, India · VCS Verified',
    badge:       'VCS Verified',
    badgeClass:  'badgeVcs' as const,
    pricePerTonne: 5,
    url:         'https://registry.verra.org/',
  },
  {
    emoji:       '🪸',
    name:        'Kenyan Cookstoves Initiative',
    meta:        'Clean cook stoves replacing open-fire · East Africa · Gold Standard',
    badge:       'Gold Standard',
    badgeClass:  'badgeGold' as const,
    pricePerTonne: 12,
    url:         'https://www.goldstandard.org/',
  },
  {
    emoji:       '🌊',
    name:        'Seagrass Restoration — UK Blue Carbon',
    meta:        'Marine ecosystem restoration · Wales, UK · Verified',
    badge:       'Verified',
    badgeClass:  'badgeVerified' as const,
    pricePerTonne: 20,
    url:         'https://www.projectseagrass.org/',
  },
] as const;

/** Format a USD dollar amount neatly */
function formatUSD(amount: number): string {
  if (amount < 1) return `$${amount.toFixed(2)}`;
  return `$${Math.round(amount).toLocaleString()}`;
}

/**
 * OffsetPanel Component.
 *
 * Renders the actionable offset marketplace panel. Calculates the annual
 * offset requirement in tonnes of CO2 and maps it to verified projects (Amazon,
 * Indian wind, Kenyan cookstoves, UK Seagrass) with custom yearly pricing.
 *
 * @param props - Contains the active user's annual carbon score in kg/year.
 * @returns React TSX element representing the marketplace panel.
 */
export function OffsetPanel({ annualKg }: OffsetPanelProps) {
  // Convert kg → tonnes
  const annualTonnes = useMemo(() => annualKg / 1000, [annualKg]);

  // Pick the cheapest project as the "recommended" total cost
  const cheapestCost = useMemo(
    () => Math.min(...OFFSET_PROJECTS.map((p) => p.pricePerTonne)) * annualTonnes,
    [annualTonnes],
  );

  return (
    <section className={styles.panel} aria-labelledby="offset-title">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Leaf size={16} color="hsl(var(--accent-green))" aria-hidden="true" />
          <h2 id="offset-title" className={styles.title}>
            Offset Marketplace
          </h2>
          <CitationTooltip citations={GLOBAL_CITATIONS} placement="bottom" />
        </div>
        <p className={styles.subtitle}>
          Vetted Gold Standard &amp; VCS projects to neutralise your remaining footprint
        </p>
      </div>

      {/* Total cost estimate */}
      <div className={styles.costSummary} aria-label={`To offset your ${annualTonnes.toFixed(2)} tonnes of CO2, the minimum cost is approximately ${formatUSD(cheapestCost)} per year`}>
        <div>
          <div className={styles.costLabel}>Your footprint to offset</div>
          <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: 2 }}>
            {annualTonnes.toFixed(2)} tonnes CO₂ / year
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={styles.costValue}>
            {formatUSD(cheapestCost)}
            <span className={styles.costUnit}>/yr</span>
          </div>
          <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', marginTop: 2 }}>
            from {formatUSD(Math.min(...OFFSET_PROJECTS.map((p) => p.pricePerTonne)))}/tonne
          </div>
        </div>
      </div>

      {/* Project cards */}
      <div className={styles.projectGrid} role="list" aria-label="Carbon offset projects">
        {OFFSET_PROJECTS.map((project) => {
          const totalCost = project.pricePerTonne * annualTonnes;
          return (
            <article
              key={project.name}
              className={styles.projectCard}
              role="listitem"
              aria-label={`${project.name}. Cost to offset your footprint: ${formatUSD(totalCost)} per year.`}
            >
              <div className={styles.projectLeft}>
                <div>
                  <span className={styles.projectEmoji} aria-hidden="true">{project.emoji}</span>{' '}
                  <span className={styles.projectName}>{project.name}</span>
                </div>
                <p className={styles.projectMeta}>{project.meta}</p>
                <span className={`${styles.projectBadge} ${styles[project.badgeClass]}`}>
                  {project.badge}
                </span>
              </div>
              <div className={styles.projectRight}>
                <div>
                  <div className={styles.projectPrice}>{formatUSD(totalCost)}/yr</div>
                  <div className={styles.projectPerTonne}>
                    ${project.pricePerTonne}/tonne
                  </div>
                </div>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.offsetCta}
                  aria-label={`Offset with ${project.name} — opens in new tab`}
                >
                  Offset Now ↗
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.disclaimer}>
        * Prices are indicative estimates. Final costs depend on market rates.
        All projects are independently verified by Gold Standard or Verra VCS.
        Aetheria Carbon does not receive commission from any offset provider.
      </p>
    </section>
  );
}
