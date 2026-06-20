'use client';

import React, { useState } from 'react';
import styles from './ReductionSimulator.module.css';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

interface SimulationItem {
  id: string;
  category: 'transport' | 'diet' | 'energy';
  title: string;
  description: string;
  savings: number;
}

interface ReductionSimulatorProps {
  simulations: SimulationItem[] | undefined;
  onToggleSim: (simId: string | null, savings: number) => void;
}

/**
 * ReductionSimulator Component.
 *
 * Renders interactive recommendation cards that allow users to select and preview
 * the direct mathematical impact of adopting a green habit.
 *
 * @param props - Contains current simulations list and toggle hooks.
 * @returns React TSX element representing the simulator block.
 */
export function ReductionSimulator({ simulations = [], onToggleSim }: ReductionSimulatorProps) {
  const [activeSimId, setActiveSimId] = useState<string | null>(null);

  const handleCardClick = (sim: SimulationItem) => {
    if (activeSimId === sim.id) {
      // Toggle off
      setActiveSimId(null);
      onToggleSim(null, 0);
    } else {
      // Toggle on
      setActiveSimId(sim.id);
      onToggleSim(sim.id, sim.savings);
    }
  };

  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'transport': return styles.badgeTransport;
      case 'diet': return styles.badgeDiet;
      case 'energy': return styles.badgeEnergy;
      default: return '';
    }
  };

  return (
    <article className={styles.simulatorContainer}>
      <div className={styles.simulatorHeader}>
        <div>
          <h2 className={styles.title}>Habit Reduction Simulator</h2>
          <p className={styles.subtitle}>Select a card to preview the dynamic impact of shifting your daily habits</p>
        </div>
        <Sparkles size={20} className="text-cyan-400" aria-hidden="true" />
      </div>

      <div className={styles.list}>
        {simulations.length === 0 ? (
          <div className={styles.emptyState}>
            Your carbon footprint is already extremely low! No additional habit shifts needed to hit targets.
          </div>
        ) : (
          simulations.slice(0, 3).map((sim) => {
            const isActive = activeSimId === sim.id;
            return (
              <button
                key={sim.id}
                type="button"
                className={`${styles.simCard} ${isActive ? styles.simCardActive : ''}`}
                onClick={() => handleCardClick(sim)}
                aria-pressed={isActive}
                aria-label={`Simulation: ${sim.title}. Potential savings: ${Math.round(sim.savings)} kg CO2 per year. Description: ${sim.description}`}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{sim.title}</h3>
                  <span className={`${styles.badge} ${getBadgeStyle(sim.category)}`}>
                    -{Math.round(sim.savings)} kg/yr
                  </span>
                </div>
                
                <p className={styles.description}>{sim.description}</p>
                
                <div className={styles.footer}>
                  <span className={styles.categoryTag}>{sim.category}</span>
                  <span className={styles.actionText}>
                    {isActive ? (
                      <>
                        Simulating <Check size={12} style={{ marginLeft: 2 }} />
                      </>
                    ) : (
                      <>
                        Preview <ArrowRight size={12} style={{ marginLeft: 2 }} />
                      </>
                    )}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </article>
  );
}
