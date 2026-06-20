'use client';

import React from 'react';
import styles from './CategoryCard.module.css';

interface CategoryCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

/**
 * CategoryCard Component.
 *
 * A reusable glassmorphism container card for the dashboard forms and widgets.
 * Focuses on semantic layout with screen-reader title bindings.
 *
 * @param props - Contains the title, icon element, and children nodes.
 * @returns React TSX element representing the card container.
 */
export function CategoryCard({ title, icon, children }: CategoryCardProps) {
  return (
    <section className={styles.card} aria-labelledby={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className={styles.cardHeader}>
        <div className={styles.iconWrapper} aria-hidden="true">
          {icon}
        </div>
        <h2 
          id={`card-title-${title.replace(/\s+/g, '-').toLowerCase()}`} 
          className={styles.cardTitle}
        >
          {title}
        </h2>
      </div>
      <div className={styles.cardContent}>
        {children}
      </div>
    </section>
  );
}
