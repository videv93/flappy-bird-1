# Flappy Bird - Social Reading App

A social reading application that helps users track reading habits, connect with fellow readers, and discover new books.

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5.x (strict mode)
- **Styling:** Tailwind CSS 4.x with shadcn/ui
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** Better Auth (OAuth with Google & Apple)
- **State Management:** Zustand
- **Testing:** Vitest + Testing Library

## Import Convention

This project uses the `@/*` import alias for cross-boundary imports. Always prefer this over relative imports:

```typescript
// Correct - use @/* alias for imports across directories
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { User } from '@/types';

// Incorrect - avoid deep relative imports
import { Button } from '../../../components/ui/button';
```

The alias is configured in `tsconfig.json` to resolve `@/*` to `./src/*`.

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

**Required environment variables:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string from Railway |
| `BETTER_AUTH_SECRET` | Auth secret (min 32 chars): `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | App URL (http://localhost:3000 for dev) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Same as BETTER_AUTH_URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `APPLE_CLIENT_ID` | Apple Services ID for Sign In with Apple |
| `APPLE_CLIENT_SECRET` | Apple JWT client secret |

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Push database schema (development):**
   ```bash
   npx prisma db push
   ```

5. **Run development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth route group
│   ├── (main)/             # Main app route group
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── features/           # Domain components
│   └── layout/             # Layout components
├── lib/                    # Utilities
├── stores/                 # Zustand stores
├── actions/                # Server Actions
├── services/               # External API clients
├── types/                  # TypeScript types
└── hooks/                  # Custom hooks
```

## Color Palette (Warm Hearth)

| Role | Color | Hex |
|------|-------|-----|
| Primary | Warm Amber | `#d97706` |
| Background | Warm Cream | `#fffbeb` |
| Secondary | Terracotta | `#c2410c` |
| Streak Success | Forest Green | `#16a34a` |
| Streak Frozen | Cool Blue | `#3b82f6` |

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Better Auth Documentation](https://www.better-auth.com)
