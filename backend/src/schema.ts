import { z } from 'zod';

export const CarbonCalculationSchema = z.object({
  // Transport inputs
  commuteMode: z.enum(['gas', 'ev', 'transit', 'bike'], {
    required_error: "Commute mode is required",
    invalid_type_error: "Commute mode must be one of: gas, ev, transit, bike"
  }),
  dailyDistance: z.number({
    required_error: "Daily distance is required",
    invalid_type_error: "Daily distance must be a number"
  }).min(0, "Distance cannot be negative").max(500, "Distance exceeds typical daily limit"),
  
  shortHaulFlights: z.number({
    required_error: "Short-haul flight count is required",
    invalid_type_error: "Short-haul flight count must be a number"
  }).min(0, "Flight count cannot be negative").max(100, "Flights exceed realistic limits"),
  
  longHaulFlights: z.number({
    required_error: "Long-haul flight count is required",
    invalid_type_error: "Long-haul flight count must be a number"
  }).min(0, "Flight count cannot be negative").max(100, "Flights exceed realistic limits"),

  // Diet inputs
  dietaryProfile: z.enum(['vegan', 'vegetarian', 'flexitarian', 'average', 'heavy'], {
    required_error: "Dietary profile is required",
    invalid_type_error: "Dietary profile must be one of: vegan, vegetarian, flexitarian, average, heavy"
  }),

  // Energy inputs
  housingType: z.enum(['apartment', 'semi-detached', 'detached'], {
    required_error: "Housing type is required",
    invalid_type_error: "Housing type must be one of: apartment, semi-detached, detached"
  }),
  powerSource: z.enum(['grid', 'solar'], {
    required_error: "Power source is required",
    invalid_type_error: "Power source must be grid or solar"
  })
});

export type CarbonCalculationInput = z.infer<typeof CarbonCalculationSchema>;

/* ── NEW: Time-Travel Projection endpoint schema ── */
export const ProjectionRequestSchema = CarbonCalculationSchema; // same shape
export type ProjectionRequest = CarbonCalculationInput;

/* ── NEW: Session state save endpoint schema ── */
export const SessionSaveSchema = z.object({
  sessionId: z.string().uuid({ message: 'sessionId must be a valid UUID v4' }),
  inputs:    CarbonCalculationSchema,
  totalKg:   z.number().nonnegative({ message: 'totalKg must be a non-negative number' }),
});
export type SessionSaveInput = z.infer<typeof SessionSaveSchema>;
