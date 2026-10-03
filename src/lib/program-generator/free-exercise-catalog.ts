export const FREE_EXERCISE_SLUGS = [
  "ab-wheel-rollout",
  "barbell-reverse-lunge",
  "bench-leg-pull-in",
  "bent-over-db-row",
  "bicep-curl",
  "cat-cow",
  "decline-db-fly",
  "ez-bar-upright-row",
  "front-squat",
  "incline-db-curl",
  "kneeling-cable-row",
  "machine-chest-fly",
  "mountain-climbers",
  "one-arm-kettlebell-row",
  "pull-up",
  "reverse-grip-lat-pulldown",
  "rowing-machine",
  "running",
  "side-lying-lateral-raise",
  "single-arm-tricep-pushdown",
  "smith-machine-front-squat",
  "thruster",
] as const;

export const FREE_EXERCISE_SET = new Set<string>(FREE_EXERCISE_SLUGS);
export const FREE_ANIMATION_URL = (slug: string) => `/animations/${slug}.webp`;
