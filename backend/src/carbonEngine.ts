/**
 * carbonEngine.ts
 * OOP Refactor of the calculation + time-travel projection engine.
 * The original functional API (calculateCarbonFootprint) is preserved
 * as a thin wrapper so existing routes remain untouched.
 */

import { CarbonCalculationInput } from './schema';
import { calculateCarbonFootprint, CalculationResult } from './calculator';

/* ──────────────────────────────────────────────────────────────
   Domain Types
────────────────────────────────────────────────────────────── */

export interface YearProjection {
  year: number;
  totalKg: number;
  /** Cumulative tonnes over the projection period */
  cumulativeTonnes: number;
  /** Percentage change vs baseline year */
  percentageDelta: number;
  /** Equivalent offset in terms of trees needed */
  treesNeeded: number;
}

export interface TimeTravelResult {
  baseline:    CalculationResult;
  projections: {
    oneYear:  YearProjection;
    fiveYear: YearProjection;
    tenYear:  YearProjection;
  };
  summary: string;
}

/* ──────────────────────────────────────────────────────────────
   CarbonCalculator — encapsulates the calculation engine
────────────────────────────────────────────────────────────── */

/**
 * Object-oriented wrapper around the existing calculation engine.
 * Keeps a reference to the last computed result for downstream use.
 */
export class CarbonCalculator {
  private lastResult: CalculationResult | null = null;

  /**
   * Compute the carbon footprint for the given input set.
   * @param input - Validated user input payload
   * @returns Full CalculationResult breakdown
   */
  public compute(input: CarbonCalculationInput): CalculationResult {
    this.lastResult = calculateCarbonFootprint(input);
    return this.lastResult;
  }

  /**
   * Returns the most recently computed result, or null if not yet computed.
   */
  public getLastResult(): CalculationResult | null {
    return this.lastResult;
  }

  /**
   * Convenience: compute and return only the total kg value.
   */
  public computeTotal(input: CarbonCalculationInput): number {
    return this.compute(input).total;
  }
}

/* ──────────────────────────────────────────────────────────────
   CarbonProjector — time-travel projection model
────────────────────────────────────────────────────────────── */

/**
 * Assumptions used in the compound projection model.
 * Each represents an annual percentage change (positive = increase,
 * negative = improvement trend).
 */
const PROJECTION_ASSUMPTIONS = {
  /**
   * Conservative: assumes no behavioural change — slight grid
   * decarbonisation only (-1.5% per year from the energy sector).
   */
  gridDecarbonisationRate: -0.015,

  /**
   * EV adoption causes an incremental improvement in transport
   * emissions if the user is on grid power (-0.5% per year).
   */
  evGridImprovementRate: -0.005,

  /**
   * One tree absorbs approximately 22 kg CO2 per year.
   * Source: US Forest Service average.
   */
  kgAbsorbedPerTreePerYear: 22,
} as const;

/**
 * Projects a carbon footprint N years into the future using a
 * compound annual improvement rate driven by grid decarbonisation.
 */
export class CarbonProjector {
  private readonly calculator: CarbonCalculator;

  constructor(calculator: CarbonCalculator) {
    this.calculator = calculator;
  }

  /**
   * Project the footprint for a single future year.
   *
   * @param input      - Current user input (used for context-aware rates)
   * @param baseline   - Baseline calculation result (year 0)
   * @param yearsAhead - Number of years into the future to project
   */
  private projectYear(
    input: CarbonCalculationInput,
    baseline: CalculationResult,
    yearsAhead: number,
  ): YearProjection {
    const baseTotal = baseline.total;

    // Determine the combined annual rate of change
    let annualRate = PROJECTION_ASSUMPTIONS.gridDecarbonisationRate;

    // EV users benefit more as grids decarbonise faster over time
    if (input.powerSource === 'solar') {
      annualRate -= 0.003; // Solar already clean — smaller marginal improvement
    }
    if (input.commuteMode === 'ev') {
      annualRate += PROJECTION_ASSUMPTIONS.evGridImprovementRate;
    }

    // Compound formula: P(n) = P(0) × (1 + r)^n
    const projectedTotal = parseFloat(
      (baseTotal * Math.pow(1 + annualRate, yearsAhead)).toFixed(2),
    );

    // Cumulative total: sum of compound series P(0) × Σ (1+r)^k for k=1..n
    let cumulative = 0;
    for (let k = 1; k <= yearsAhead; k++) {
      cumulative += baseTotal * Math.pow(1 + annualRate, k);
    }
    const cumulativeTonnes = parseFloat((cumulative / 1000).toFixed(2));

    const percentageDelta = parseFloat(
      (((projectedTotal - baseTotal) / baseTotal) * 100).toFixed(1),
    );

    const treesNeeded = Math.ceil(
      projectedTotal / PROJECTION_ASSUMPTIONS.kgAbsorbedPerTreePerYear,
    );

    return {
      year: new Date().getFullYear() + yearsAhead,
      totalKg: projectedTotal,
      cumulativeTonnes,
      percentageDelta,
      treesNeeded,
    };
  }

  /**
   * Generate a complete 1yr / 5yr / 10yr time-travel projection.
   *
   * @param input - Current user input payload
   * @returns TimeTravelResult containing baseline + all three projections
   */
  public project(input: CarbonCalculationInput): TimeTravelResult {
    const baseline   = this.calculator.compute(input);
    const oneYear    = this.projectYear(input, baseline, 1);
    const fiveYear   = this.projectYear(input, baseline, 5);
    const tenYear    = this.projectYear(input, baseline, 10);

    const direction  = tenYear.percentageDelta < 0 ? 'decrease' : 'increase';
    const magnitude  = Math.abs(tenYear.percentageDelta);

    const summary =
      `At your current habits, your footprint is projected to ${direction} ` +
      `by ${magnitude}% over the next decade, reaching ` +
      `${Math.round(tenYear.totalKg).toLocaleString()} kg/year by ${tenYear.year}. ` +
      `Over 10 years that is ${tenYear.cumulativeTonnes} tonnes of CO₂ cumulative, ` +
      `requiring ${tenYear.treesNeeded} trees per year to offset.`;

    return { baseline, projections: { oneYear, fiveYear, tenYear }, summary };
  }
}

// Shared singleton instances (imported by routes)
export const sharedCalculator = new CarbonCalculator();
export const sharedProjector  = new CarbonProjector(sharedCalculator);
