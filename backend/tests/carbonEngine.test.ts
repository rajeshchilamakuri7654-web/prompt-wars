import { CarbonCalculator, CarbonProjector } from '../src/carbonEngine';
import { CarbonCalculationInput } from '../src/schema';

describe('Carbon Engine OOP Classes Tests', () => {
  let calculator: CarbonCalculator;
  let projector: CarbonProjector;

  const defaultInput: CarbonCalculationInput = {
    commuteMode: 'gas',
    dailyDistance: 25,
    shortHaulFlights: 2,
    longHaulFlights: 1,
    dietaryProfile: 'average',
    housingType: 'semi-detached',
    powerSource: 'grid'
  };

  beforeEach(() => {
    calculator = new CarbonCalculator();
    projector = new CarbonProjector(calculator);
  });

  test('CarbonCalculator computes total and stores last result', () => {
    expect(calculator.getLastResult()).toBeNull();
    const result = calculator.compute(defaultInput);
    expect(calculator.getLastResult()).toEqual(result);
    
    const computedTotal = calculator.computeTotal(defaultInput);
    expect(computedTotal).toBe(result.total);
  });

  test('CarbonProjector outputs multi-year predictions based on user inputs', () => {
    const result = projector.project(defaultInput);
    
    expect(result.baseline.total).toBe(calculator.computeTotal(defaultInput));
    expect(result.projections.oneYear).toBeDefined();
    expect(result.projections.fiveYear).toBeDefined();
    expect(result.projections.tenYear).toBeDefined();

    const { oneYear, fiveYear, tenYear } = result.projections;
    expect(oneYear.year).toBe(new Date().getFullYear() + 1);
    expect(fiveYear.year).toBe(new Date().getFullYear() + 5);
    expect(tenYear.year).toBe(new Date().getFullYear() + 10);

    expect(oneYear.percentageDelta).toBeLessThan(0);
    expect(fiveYear.percentageDelta).toBeLessThan(oneYear.percentageDelta);
    expect(tenYear.percentageDelta).toBeLessThan(fiveYear.percentageDelta);

    expect(result.summary).toContain('At your current habits');
    expect(result.summary).toContain('10 years');
  });

  test('CarbonProjector handles solar and EV rates adjustments', () => {
    const ecoInput: CarbonCalculationInput = {
      ...defaultInput,
      powerSource: 'solar',
      commuteMode: 'ev'
    };

    const ecoResult = projector.project(ecoInput);
    const standardResult = projector.project(defaultInput);

    expect(ecoResult.projections.tenYear.percentageDelta).toBeLessThan(standardResult.projections.tenYear.percentageDelta);
  });

  test('CarbonProjector handles emissions increase summary formatting branch', () => {
    // Spy on the private projectYear method to simulate an increasing carbon footprint
    const spy = jest.spyOn(projector as any, 'projectYear').mockImplementation((input: any, baseline: any, yearsAhead: any) => {
      const years = yearsAhead as number;
      return {
        year: new Date().getFullYear() + years,
        totalKg: baseline.total * 1.2,
        cumulativeTonnes: 15.5,
        percentageDelta: 20.0, // positive delta!
        treesNeeded: 100
      };
    });

    const result = projector.project(defaultInput);
    expect(result.summary).toContain('projected to increase');
    expect(result.summary).toContain('20%');

    spy.mockRestore();
  });
});
