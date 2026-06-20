'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const SUSTAINABLE_THRESHOLD = 2000; // kg/year — Paris-aligned

/**
 * useConfetti
 * Fires a celebration confetti burst exactly once each time the user's
 * carbon score drops below the sustainable threshold (2,000 kg/year).
 *
 * Uses an eco-friendly palette: greens and cyans only.
 * The burst is 60FPS-safe — canvas-confetti renders to an offscreen canvas
 * that composites on top, causing zero layout repaints.
 */
export function useConfetti(score: number): void {
  const prevScoreRef    = useRef<number>(score);
  const hasShownRef     = useRef<boolean>(false);

  useEffect(() => {
    const prev    = prevScoreRef.current;
    const crossed = prev >= SUSTAINABLE_THRESHOLD && score < SUSTAINABLE_THRESHOLD;

    if (crossed && !hasShownRef.current) {
      hasShownRef.current = true;

      // Eco-green burst from left side
      confetti({
        particleCount: 80,
        spread: 70,
        angle: 60,
        origin: { x: 0.1, y: 0.5 },
        colors: ['#00e676', '#00f2fe', '#76ff03', '#18ffff', '#64dd17'],
        ticks: 200,
        gravity: 0.8,
        scalar: 0.9,
        shapes: ['circle', 'square'],
      });

      // Burst from right side — slight delay for organic feel
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          angle: 120,
          origin: { x: 0.9, y: 0.5 },
          colors: ['#00e676', '#00f2fe', '#76ff03', '#18ffff', '#64dd17'],
          ticks: 200,
          gravity: 0.8,
          scalar: 0.9,
          shapes: ['circle', 'square'],
        });
      }, 150);

      // Rain of stars from top for extra impact
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 100,
          origin: { x: 0.5, y: 0 },
          colors: ['#00e676', '#ffffff', '#00f2fe'],
          ticks: 300,
          gravity: 0.6,
          scalar: 1.2,
          shapes: ['star'],
        });
      }, 300);

    } else if (score >= SUSTAINABLE_THRESHOLD) {
      // Reset so confetti fires again if user dips below threshold again
      hasShownRef.current = false;
    }

    prevScoreRef.current = score;
  }, [score]);
}
