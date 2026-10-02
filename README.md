# Gym Progress

Mobile-first fitness PWA with personalized workout generation, workout tracking, progression and an admin content-management panel.

## Product areas

- User authentication
- Personalized onboarding
- Workout plans assigned by the training team
- Exercise and media library
- Active workout player
- Set/weight/reps/RIR tracking
- Progress and body-weight tracking
- Admin dashboard
- Exercise/media management
- Workout program management
- Admin analytics and audit log

## Architecture

```text
User
  -> Onboarding
  -> Profile + goals + preferences
  -> Assigned Workout Plan
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
  -> Analytics
  -> Audit Log
```

## Local development

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

`db:seed` imports the RepDB free-tier exercise catalog and its static WebP pose illustrations for use inside this app. It requires network access during seeding. RepDB requires visible attribution. The free dataset does not include production-licensed animated GIFs; its paid-tier preview animations must not be used in production.

## Environment

`DATABASE_URL` is required. The current Prisma schema uses SQLite. A production host must provide a persistent writable disk for the database and uploaded exercise media, and run a single app instance. Ephemeral/serverless filesystems are not supported by this configuration. PostgreSQL and remote object storage need an explicit schema/provider integration before using those services.

Set `NODE_ENV=production` in production. Demo accounts and demo workout plans are skipped in this mode. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` only for the initial admin bootstrap; existing production admin credentials are never reset by the seed.

Login attempts are counted by a one-way email key in the database; five failed attempts within 15 minutes trigger a 15-minute cooldown. Before opening registration to real users, also configure edge rate limits for `/api/auth/login` and `/api/auth/register`, publish the app behind HTTPS, and provide the privacy and data-retention information required for the service owner and jurisdiction.

Exercise data by [RepDB](https://repdb.co).

## Design

The UI follows the supplied Gym Progress/Figma direction: dark deep-green surfaces, lime accent, rounded cards, prominent exercise media and mobile-first navigation.
