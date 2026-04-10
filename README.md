# MealOps

Personal meal prep planning and nutrition tracking for a household of 2.

## Setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Push schema to SQLite |
| `npm run db:seed` | Seed database (idempotent) |
| `npm run db:studio` | Open Drizzle Studio |

## Stack

- **Framework:** Next.js 16 (App Router, Server Components)
- **Language:** TypeScript
- **Database:** SQLite via Drizzle ORM
- **Styling:** Tailwind CSS 4
- **UI:** Custom components inspired by shadcn/ui
- **Charts:** Recharts
- **Icons:** Lucide React

## Pre-loaded Recipes

1. **Freezer Breakfast Burritos** (14 servings, $0.80/ea)
2. **Sheet Pan Chicken & Rice Bowls** (10 servings, $1.80/ea)
3. **Beef & Bean Freezer Burritos** (10 servings, $1.50/ea)

All recipes include step-by-step instructions with timers, tips, and beginner-friendly detail.
