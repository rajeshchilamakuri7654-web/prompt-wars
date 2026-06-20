import { CarbonCalculationInput } from './schema';

export interface CalculationResult {
  total: number; // in kg CO2/year
  breakdown: {
    transport: {
      total: number;
      commute: number;
      flights: number;
    };
    diet: {
      total: number;
    };
    energy: {
      total: number;
      electricity: number;
      heating: number;
    };
  };
  simulation: Array<{
    id: string;
    category: 'transport' | 'diet' | 'energy';
    title: string;
    description: string;
    savings: number; // in kg CO2/year
  }>;
}

// Commute Mode Factors (kg CO2 per km)
const COMMUTE_FACTORS = {
  gas: 0.18,
  ev: 0.05,
  transit: 0.04,
  bike: 0.00
};

// Flight Factors (kg CO2 per flight)
const FLIGHT_FACTORS = {
  shortHaul: 150,
  longHaul: 900
};

// Diet Factors (kg CO2 per year)
const DIET_FACTORS = {
  vegan: 600,
  vegetarian: 900,
  flexitarian: 1400,
  average: 2000,
  heavy: 2800
};

// Energy consumption configurations (kWh per year)
interface EnergyUsage {
  electricity: number;
  heating: number;
}

const ENERGY_USAGE: Record<CarbonCalculationInput['housingType'], EnergyUsage> = {
  apartment: { electricity: 1500, heating: 2000 },
  'semi-detached': { electricity: 3000, heating: 4000 },
  detached: { electricity: 5000, heating: 7000 }
};

// Power source factors (kg CO2 per kWh)
const ELECTRICITY_FACTORS = {
  grid: 0.40,
  solar: 0.05
};

const HEATING_FACTORS = {
  grid: 0.20,
  solar: 0.10 // 50% discount on heating offset assuming solar feeds heat pump/electric heating
};

/**
 * Calculates the total annual CO2 equivalent emissions in kilograms per year and
 * generates optimized carbon reduction recommendation simulations.
 *
 * @param input - The validated user inputs mapping Transport, Diet, and Energy categories.
 * @returns A comprehensive CalculationResult containing the grand total emissions,
 * detailed breakdown per category, and sorted savings recommendations.
 */
export function calculateCarbonFootprint(input: CarbonCalculationInput): CalculationResult {
  // 1. Calculate Transport Emissions
  const dailyDistance = input.dailyDistance;
  const annualDistance = dailyDistance * 365;
  const commuteEmissions = annualDistance * COMMUTE_FACTORS[input.commuteMode];
  
  const shortHaulEmissions = input.shortHaulFlights * FLIGHT_FACTORS.shortHaul;
  const longHaulEmissions = input.longHaulFlights * FLIGHT_FACTORS.longHaul;
  const flightsEmissions = shortHaulEmissions + longHaulEmissions;
  const transportTotal = commuteEmissions + flightsEmissions;

  // 2. Calculate Diet Emissions
  const dietTotal = DIET_FACTORS[input.dietaryProfile];

  // 3. Calculate Energy Emissions
  const usage = ENERGY_USAGE[input.housingType];
  const electricityEmissions = usage.electricity * ELECTRICITY_FACTORS[input.powerSource];
  const heatingEmissions = usage.heating * HEATING_FACTORS[input.powerSource];
  const energyTotal = electricityEmissions + heatingEmissions;

  // 4. Grand Total
  const total = parseFloat((transportTotal + dietTotal + energyTotal).toFixed(2));

  // 5. Generate Simulation Recommendations
  const simulation: CalculationResult['simulation'] = [];

  // Transport simulations
  if (input.commuteMode === 'gas' && dailyDistance > 0) {
    // Switch to Transit
    const transitSavings = annualDistance * (COMMUTE_FACTORS.gas - COMMUTE_FACTORS.transit);
    simulation.push({
      id: 'switch_transit',
      category: 'transport',
      title: 'Commute via Transit',
      description: `Switching your daily commute from Gas to Public Transit saves ${Math.round(transitSavings / 52)} kg of CO2/week.`,
      savings: parseFloat(transitSavings.toFixed(2))
    });

    // Switch to EV
    const evSavings = annualDistance * (COMMUTE_FACTORS.gas - COMMUTE_FACTORS.ev);
    simulation.push({
      id: 'switch_ev',
      category: 'transport',
      title: 'Upgrade to Electric Vehicle',
      description: `Switching your commute from Gas to an EV saves ${Math.round(evSavings)} kg of CO2/year.`,
      savings: parseFloat(evSavings.toFixed(2))
    });

    // Switch to Bike
    if (dailyDistance <= 15) {
      const bikeSavings = annualDistance * COMMUTE_FACTORS.gas;
      simulation.push({
        id: 'switch_bike',
        category: 'transport',
        title: 'Commute by Bicycle',
        description: `Biking to work instead of driving Gas saves ${Math.round(bikeSavings)} kg of CO2/year.`,
        savings: parseFloat(bikeSavings.toFixed(2))
      });
    }
  } else if (input.commuteMode === 'ev' && dailyDistance > 0 && dailyDistance <= 15) {
    const bikeSavings = annualDistance * COMMUTE_FACTORS.ev;
    simulation.push({
      id: 'switch_bike_from_ev',
      category: 'transport',
      title: 'Commute by Bicycle',
      description: `Biking to work instead of driving your EV saves ${Math.round(bikeSavings)} kg of CO2/year.`,
      savings: parseFloat(bikeSavings.toFixed(2))
    });
  } else if (input.commuteMode === 'transit' && dailyDistance > 0 && dailyDistance <= 15) {
    const bikeSavings = annualDistance * COMMUTE_FACTORS.transit;
    simulation.push({
      id: 'switch_bike_from_transit',
      category: 'transport',
      title: 'Commute by Bicycle',
      description: `Biking to work instead of public transit saves ${Math.round(bikeSavings)} kg of CO2/year.`,
      savings: parseFloat(bikeSavings.toFixed(2))
    });
  }

  // Flights reduction simulations
  if (input.shortHaulFlights > 0) {
    const flightSavings = FLIGHT_FACTORS.shortHaul;
    simulation.push({
      id: 'reduce_short_haul',
      category: 'transport',
      title: 'Avoid One Short-Haul Flight',
      description: `Replacing one short-haul flight with train travel saves ${flightSavings} kg of CO2.`,
      savings: flightSavings
    });
  }
  if (input.longHaulFlights > 0) {
    const flightSavings = FLIGHT_FACTORS.longHaul;
    simulation.push({
      id: 'reduce_long_haul',
      category: 'transport',
      title: 'Avoid One Long-Haul Flight',
      description: `Avoiding one long-haul flight or replacing with virtual meetings saves ${flightSavings} kg of CO2.`,
      savings: flightSavings
    });
  }

  // Diet simulations
  if (input.dietaryProfile === 'heavy') {
    const flexSavings = DIET_FACTORS.heavy - DIET_FACTORS.flexitarian;
    simulation.push({
      id: 'diet_flexitarian',
      category: 'diet',
      title: 'Transition to Flexitarian Diet',
      description: `Reducing meat consumption to flexitarian saves ${flexSavings} kg of CO2/year.`,
      savings: flexSavings
    });
    const vegSavings = DIET_FACTORS.heavy - DIET_FACTORS.vegetarian;
    simulation.push({
      id: 'diet_vegetarian',
      category: 'diet',
      title: 'Adopt Vegetarian Lifestyle',
      description: `Cutting meat out completely saves ${vegSavings} kg of CO2/year.`,
      savings: vegSavings
    });
  } else if (input.dietaryProfile === 'average') {
    const vegSavings = DIET_FACTORS.average - DIET_FACTORS.vegetarian;
    simulation.push({
      id: 'diet_vegetarian',
      category: 'diet',
      title: 'Adopt Vegetarian Lifestyle',
      description: `Going vegetarian saves ${vegSavings} kg of CO2/year.`,
      savings: vegSavings
    });
    const veganSavings = DIET_FACTORS.average - DIET_FACTORS.vegan;
    simulation.push({
      id: 'diet_vegan',
      category: 'diet',
      title: 'Transition to Vegan Diet',
      description: `Adopting a plant-based vegan lifestyle saves ${veganSavings} kg of CO2/year.`,
      savings: veganSavings
    });
  } else if (input.dietaryProfile === 'flexitarian') {
    const vegSavings = DIET_FACTORS.flexitarian - DIET_FACTORS.vegetarian;
    simulation.push({
      id: 'diet_vegetarian',
      category: 'diet',
      title: 'Adopt Vegetarian Lifestyle',
      description: `Stepping up from flexitarian to vegetarian saves ${vegSavings} kg of CO2/year.`,
      savings: vegSavings
    });
    const veganSavings = DIET_FACTORS.flexitarian - DIET_FACTORS.vegan;
    simulation.push({
      id: 'diet_vegan',
      category: 'diet',
      title: 'Transition to Vegan Diet',
      description: `Transitioning to a fully plant-based vegan diet saves ${veganSavings} kg of CO2/year.`,
      savings: veganSavings
    });
  } else if (input.dietaryProfile === 'vegetarian') {
    const veganSavings = DIET_FACTORS.vegetarian - DIET_FACTORS.vegan;
    simulation.push({
      id: 'diet_vegan',
      category: 'diet',
      title: 'Transition to Vegan Diet',
      description: `Eliminating dairy and eggs to go vegan saves ${veganSavings} kg of CO2/year.`,
      savings: veganSavings
    });
  }

  // Energy simulations
  if (input.powerSource === 'grid') {
    const solarSavings = (usage.electricity * (ELECTRICITY_FACTORS.grid - ELECTRICITY_FACTORS.solar)) +
                         (usage.heating * (HEATING_FACTORS.grid - HEATING_FACTORS.solar));
    simulation.push({
      id: 'switch_solar',
      category: 'energy',
      title: 'Install Solar Panels',
      description: `Switching your home energy source to solar saves ${Math.round(solarSavings)} kg of CO2/year.`,
      savings: parseFloat(solarSavings.toFixed(2))
    });
  }

  // Sort simulation savings descending
  simulation.sort((a, b) => b.savings - a.savings);

  return {
    total,
    breakdown: {
      transport: {
        total: parseFloat(transportTotal.toFixed(2)),
        commute: parseFloat(commuteEmissions.toFixed(2)),
        flights: parseFloat(flightsEmissions.toFixed(2))
      },
      diet: {
        total: parseFloat(dietTotal.toFixed(2))
      },
      energy: {
        total: parseFloat(energyTotal.toFixed(2)),
        electricity: parseFloat(electricityEmissions.toFixed(2)),
        heating: parseFloat(heatingEmissions.toFixed(2))
      }
    },
    simulation
  };
}
