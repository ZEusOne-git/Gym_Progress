import { z } from "zod";

const nullableNumber = z.preprocess(
  value => value === "" || value === undefined || value === null ? null : Number(value),
  z.number().finite().nullable(),
);

const exerciseInput = z.object({
  exerciseId: z.string().trim().min(1, "Seleziona un esercizio."),
  sets: z.coerce.number().int().min(1).max(30),
  repMin: z.coerce.number().int().min(1).max(100),
  repMax: z.coerce.number().int().min(1).max(100),
  rirTarget: nullableNumber,
  restSeconds: z.coerce.number().int().min(0).max(3600),
  setType: z.enum(["NORMAL", "WARM_UP", "SUPERSET", "GIANT_SET", "CIRCUIT", "DROP_SET", "FINISHER"]),
  progressionType: z.enum(["DOUBLE_PROGRESSION", "LOAD_INCREASE", "RIR_TARGET", "MANUAL", "NONE"]),
  loadIncrement: nullableNumber,
  tempo: z.string().nullable().optional(),
  targetWeight: nullableNumber,
  notes: z.string().nullable().optional(),
}).refine(item => item.repMax >= item.repMin, {
  message: "Le ripetizioni massime devono essere pari o superiori a quelle minime.",
  path: ["repMax"],
});

const dayInput = z.object({
  name: z.string().trim().min(1, "Dai un nome a ogni giorno.").max(100),
  estimatedMins: z.coerce.number().int().min(1).max(360).nullable().optional(),
  exercises: z.array(exerciseInput).min(1, "Ogni giorno deve contenere almeno un esercizio.").max(100),
});

export const workoutPlanInput = z.object({
  name: z.string().trim().min(1, "Inserisci il nome del programma.").max(120),
  days: z.array(dayInput).min(1, "Il programma deve contenere almeno un giorno.").max(7),
});

export type WorkoutPlanInput = z.infer<typeof workoutPlanInput>;
