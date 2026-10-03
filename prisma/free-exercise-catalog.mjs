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
];

export const FREE_ANIMATION_MEDIA = Object.fromEntries(
  FREE_EXERCISE_SLUGS.map(slug => [slug, `/animations/${slug}.webp`]),
);

export const FREE_EXERCISE_SET = new Set(FREE_EXERCISE_SLUGS);
