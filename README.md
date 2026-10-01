# Gym Progress

Mobile-first fitness PWA with personalized workout generation, workout tracking, progression and an admin content-management panel.

## Product areas

- User authentication
- Personalized onboarding
- Rule-based workout generator
- Exercise and media library
- Active workout player
- Set/weight/reps/RIR tracking
- Progress and body-weight tracking
- Admin dashboard
- Exercise/media management
- Workout program management
- Generator rules
- Analytics and audit log

## Architecture

```text
User
  -> Onboarding
  -> Profile + goals + preferences
  -> Workout Generator
  -> Workout Plan
  -> Active Workout
  -> Performance
  -> Progression Engine
  -> Next Workout

Admin
  -> Users
  -> Exercises
  -> Media
  -> Programs
  -> Generator Rules
  -> Analytics
  -> Audit Log
```

## Local development

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

## Environment

`DATABASE_URL` is required. Development uses SQLite; production should use PostgreSQL.

## Design

The UI follows the supplied Gym Progress/Figma direction: dark deep-green surfaces, lime accent, rounded cards, prominent exercise media and mobile-first navigation.
