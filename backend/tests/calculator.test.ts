import { calculateCarbonFootprint } from '../src/calculator';
import { CarbonCalculationInput } from '../src/schema';

describe('Carbon Calculator Engine Tests', () => {
  
  test('Vegan, biking, solar, apartment profile should have low footprint', () => {
    const input: CarbonCalculationInput = {
      commuteMode: 'bike',
      dailyDistance: 10,
      shortHaulFlights: 0,
      longHaulFlights: 0,
      dietaryProfile: 'vegan',
      housingType: 'apartment',
      powerSource: 'solar'
    };

    const result = calculateCarbonFootprint(input);

    expect(result.breakdown.transport.commute).toBe(0);
    expect(result.breakdown.transport.total).toBe(0);
    expect(result.breakdown.diet.total).toBe(600);
    expect(result.breakdown.energy.electricity).toBe(75);
    expect(result.breakdown.energy.heating).toBe(200);
    expect(result.breakdown.energy.total).toBe(275);
    expect(result.total).toBe(875);
    
    const solarSim = result.simulation.find(s => s.id === 'switch_solar');
    expect(solarSim).toBeUndefined();
  });

  test('Gas car commuter, heavy meat eater, detached house, grid electricity should have high footprint', () => {
    const input: CarbonCalculationInput = {
      commuteMode: 'gas',
      dailyDistance: 50,
      shortHaulFlights: 2,
      longHaulFlights: 1,
      dietaryProfile: 'heavy',
      housingType: 'detached',
      powerSource: 'grid'
    };

    const result = calculateCarbonFootprint(input);

    expect(result.breakdown.transport.commute).toBe(3285);
    expect(result.breakdown.transport.flights).toBe(1200);
    expect(result.breakdown.transport.total).toBe(4485);
    expect(result.breakdown.diet.total).toBe(2800);
    expect(result.breakdown.energy.electricity).toBe(2000);
    expect(result.breakdown.energy.heating).toBe(1400);
    expect(result.breakdown.energy.total).toBe(3400);
    expect(result.total).toBe(10685);

    const solarSim = result.simulation.find(s => s.id === 'switch_solar');
    expect(solarSim).toBeDefined();
    expect(solarSim?.savings).toBe(2450);

    const transitSim = result.simulation.find(s => s.id === 'switch_transit');
    expect(transitSim).toBeDefined();
    expect(transitSim?.savings).toBe(2555);
  });

  test('Boundary: Zero commute distance and zero flights', () => {
    const input: CarbonCalculationInput = {
      commuteMode: 'gas',
      dailyDistance: 0,
      shortHaulFlights: 0,
      longHaulFlights: 0,
      dietaryProfile: 'average',
      housingType: 'semi-detached',
      powerSource: 'solar'
    };

    const result = calculateCarbonFootprint(input);
    expect(result.breakdown.transport.commute).toBe(0);
    expect(result.breakdown.transport.total).toBe(0);
    expect(result.total).toBe(result.breakdown.diet.total + result.breakdown.energy.total);
    const transitSim = result.simulation.find(s => s.id === 'switch_transit');
    expect(transitSim).toBeUndefined();
  });

  test('EV and Transit commute modes with bicycle recommendations', () => {
    // EV commuter within biking distance (<= 15)
    const inputEV: CarbonCalculationInput = {
      commuteMode: 'ev',
      dailyDistance: 10,
      shortHaulFlights: 0,
      longHaulFlights: 0,
      dietaryProfile: 'vegetarian',
      housingType: 'apartment',
      powerSource: 'grid'
    };
    const resEV = calculateCarbonFootprint(inputEV);
    expect(resEV.breakdown.transport.commute).toBe(182.5);
    const bikeSimEV = resEV.simulation.find(s => s.id === 'switch_bike_from_ev');
    expect(bikeSimEV).toBeDefined();
    expect(bikeSimEV?.savings).toBe(182.5);

    // Transit commuter within biking distance (<= 15)
    const inputTransit: CarbonCalculationInput = {
      commuteMode: 'transit',
      dailyDistance: 12,
      shortHaulFlights: 0,
      longHaulFlights: 0,
      dietaryProfile: 'flexitarian',
      housingType: 'apartment',
      powerSource: 'grid'
    };
    const resTransit = calculateCarbonFootprint(inputTransit);
    expect(resTransit.breakdown.transport.commute).toBe(175.2);
    const bikeSimTransit = resTransit.simulation.find(s => s.id === 'switch_bike_from_transit');
    expect(bikeSimTransit).toBeDefined();
    expect(bikeSimTransit?.savings).toBe(175.2);
  });

  test('EV and Transit commute modes outside biking distance (> 15)', () => {
    // EV commuter outside biking distance
    const inputEV: CarbonCalculationInput = {
      commuteMode: 'ev',
      dailyDistance: 25,
      shortHaulFlights: 0,
      longHaulFlights: 0,
      dietaryProfile: 'vegetarian',
      housingType: 'apartment',
      powerSource: 'grid'
    };
    const resEV = calculateCarbonFootprint(inputEV);
    const bikeSimEV = resEV.simulation.find(s => s.id === 'switch_bike_from_ev');
    expect(bikeSimEV).toBeUndefined(); // Should not recommend biking for 25km

    // Transit commuter outside biking distance
    const inputTransit: CarbonCalculationInput = {
      commuteMode: 'transit',
      dailyDistance: 30,
      shortHaulFlights: 0,
      longHaulFlights: 0,
      dietaryProfile: 'flexitarian',
      housingType: 'apartment',
      powerSource: 'grid'
    };
    const resTransit = calculateCarbonFootprint(inputTransit);
    const bikeSimTransit = resTransit.simulation.find(s => s.id === 'switch_bike_from_transit');
    expect(bikeSimTransit).toBeUndefined(); // Should not recommend biking for 30km
  });

  test('Dietary profile alternatives and savings computations', () => {
    const dietaryProfiles: Array<CarbonCalculationInput['dietaryProfile']> = [
      'heavy', 'average', 'flexitarian', 'vegetarian'
    ];

    dietaryProfiles.forEach((profile) => {
      const input: CarbonCalculationInput = {
        commuteMode: 'bike',
        dailyDistance: 0,
        shortHaulFlights: 0,
        longHaulFlights: 0,
        dietaryProfile: profile,
        housingType: 'apartment',
        powerSource: 'grid'
      };
      const result = calculateCarbonFootprint(input);
      const dietSims = result.simulation.filter(s => s.category === 'diet');
      expect(dietSims.length).toBeGreaterThan(0);
    });
  });
});
