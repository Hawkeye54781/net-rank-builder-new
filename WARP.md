# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Tennis Ladder** - A web application for managing tennis club ladders, player rankings, and match tracking. Built with React, TypeScript, and Supabase as the backend. Originally created through Lovable.dev platform.

## Development Commands

### Core Commands

```bash
# Start development server (runs on http://[::]:8080)
npm run dev

# Build for production
npm run build

# Build for development (includes development plugins)
npm run build:dev

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Package Management

This project uses npm for package management. The lock file is `package-lock.json`.

```bash
# Install dependencies
npm i

# Add a new dependency
npm install <package-name>

# Add a dev dependency
npm install -D <package-name>
```

### Testing

**Note:** This project does not currently have a test suite configured. When adding tests, consider using Vitest (pairs well with Vite).

## High-Level Architecture

### Tech Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5 with SWC for fast compilation
- **UI Framework:** shadcn-ui (Radix UI primitives) + Tailwind CSS
- **Backend:** Supabase (PostgreSQL database with real-time capabilities)
- **State Management:** TanStack Query (React Query) for server state
- **Routing:** React Router v6
- **Form Handling:** React Hook Form + Zod for validation
- **Styling:** Tailwind CSS with custom tennis theme

### Application Architecture

#### Entry Point & Routing
- `src/main.tsx` - React app initialization
- `src/App.tsx` - Root component with providers (QueryClient, TooltipProvider, BrowserRouter)
- Single page app with main route at `/` (Index page) and catch-all 404 route

#### Authentication Flow
1. **Index.tsx** - Main entry point that handles auth state
2. User checks session via Supabase auth
3. Routes to either:
   - `AuthPage` component (for unauthenticated users)
   - `Dashboard` component (for authenticated users)

#### Core Data Model (Supabase)

**Tables:**
- `clubs` - Tennis clubs (name, location)
- `profiles` - Player profiles linked to auth users (ELO rating, stats, club_id)
- `ladders` - Competition ladders (belongs to club, has type: singles/doubles)
- `ladder_participants` - Join table (player participation in ladders)
- `matches` - Match records (scores, ELO changes, winner)
- `user_roles` - Role-based access control (admin, member)
- `club_subscriptions` - Subscription management
- `subscription_plans` - Available pricing plans
- `yearly_winners` - Historical ladder winners

**Key Relationships:**
- Profiles belong to Clubs
- Ladders belong to Clubs
- Matches belong to Ladders and reference two Players
- User roles are scoped to specific clubs

#### Component Structure

**Pages:**
- `pages/Index.tsx` - Main landing/auth gate
- `pages/NotFound.tsx` - 404 error page

**Core Components:**
- `Dashboard.tsx` - Main app interface with tabs (Ladders, Rankings, Matches, Admin)
- `AuthPage.tsx` - Authentication interface
- `LadderManagement.tsx` - Admin interface for managing ladders
- `AddLadderDialog.tsx` - Dialog for creating new ladders
- `LadderParticipants.tsx` - Display/manage participants in a ladder
- `LadderParticipationButton.tsx` - Join/leave ladder functionality

**UI Components:**
Located in `src/components/ui/` - shadcn-ui components (accordion, button, card, dialog, etc.)

#### Custom Hooks

- `useClubAdmin(user, clubId)` - Checks if user has admin role via Supabase RPC
- `useLadderParticipation(ladderId, playerId)` - Manages ladder join/leave operations and participant counts
- `use-toast` - Toast notification system
- `use-mobile` - Mobile device detection

#### Key Features

**Player Dashboard:**
- View ELO rating and club rank
- Track matches played and win rate
- Browse available ladders
- Join/leave ladders

**Admin Panel:**
- Create/edit/delete ladders
- Toggle ladder active/inactive status
- View all participants in ladders

**ELO System:**
Matches store before/after ELO ratings for both players. ELO calculations are handled on match creation.

### State Management Pattern

- **Server State:** TanStack Query handles all API calls to Supabase
- **Local State:** React useState for component-level state
- **Auth State:** Managed via Supabase auth listeners in Index.tsx
- **No global state library** (Redux/Zustand) - intentionally kept simple

### Path Aliases

The project uses path aliases configured in `tsconfig.json` and `vite.config.ts`:

```typescript
"@/*" resolves to "./src/*"
```

**Usage Example:**
```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
```

### Supabase Integration

**Client Setup:**
- `src/integrations/supabase/client.ts` - Configured client with localStorage persistence
- `src/integrations/supabase/types.ts` - Auto-generated TypeScript types from database schema

**Environment Variables:**
Located in `.env` file (Vite requires `VITE_` prefix):
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Important:** Supabase types are auto-generated. If the database schema changes, regenerate types using Supabase CLI:
```bash
npx supabase gen types typescript --project-id kpizlvfvwazvpkuncxfq > src/integrations/supabase/types.ts
```

### Styling Approach

**Tailwind Configuration:**
- Custom tennis-themed colors (gradient-court, primary variants)
- shadcn-ui CSS variables for theming
- Typography plugin enabled

**CSS Files:**
- `src/index.css` - Global styles and Tailwind directives
- `src/App.css` - Legacy, likely unused

**Component Styling:**
Uses Tailwind utility classes with shadcn-ui patterns. Components use `cn()` utility from `@/lib/utils` for conditional class merging.

### Development Server Configuration

Vite dev server configured to:
- Listen on all interfaces (`host: "::"`)
- Port 8080
- Hot module replacement enabled
- SWC for fast TypeScript transpilation

### Lovable Platform Integration

This project integrates with Lovable.dev:
- `lovable-tagger` plugin enabled in development mode
- Changes made via Lovable are auto-committed to this repo
- Can be deployed via Lovable's hosting

## Database Schema Knowledge

### Role-Based Access Control
- `user_roles` table defines admin/member roles
- Use `is_club_admin(user_id, club_id)` RPC function to check admin status
- Admin UI is conditionally rendered in Dashboard based on `useClubAdmin` hook

### Ladder Participation
- Players join ladders via `ladder_participants` table
- `is_active` flag allows soft deletion
- Track join dates and participation history

### Match Recording
Match records capture:
- Player scores
- ELO ratings before and after match
- Winner reference
- Associated ladder
- Match date

## Code Conventions

### TypeScript Configuration
- Relaxed type checking (`noImplicitAny: false`, `strictNullChecks: false`)
- Skip lib checking for faster builds
- Use `@/` path aliases for imports

### Component Patterns
- Functional components with hooks
- Props interfaces defined inline or at top of file
- Async operations with try/catch and loading states
- Toast notifications for user feedback

### Supabase Patterns
```typescript
// Fetching data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

// Check for specific error code (PGRST116 = not found)
if (error && error.code !== 'PGRST116') {
  throw error;
}

// Inserting data
const { error } = await supabase
  .from('table_name')
  .insert([{ field: value }]);
```

## shadcn-ui Component Management

Add new shadcn-ui components:
```bash
npx shadcn@latest add <component-name>
```

Configuration is in `components.json`. Components are added to `src/components/ui/`.

## Windows-Specific Notes

- File paths use backslashes on Windows
- PowerShell is the default shell
- Line endings are CRLF (`\r\n`)
- Use `$env:` prefix for environment variables in PowerShell

## Key Files Reference

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build configuration, aliases, plugins |
| `tailwind.config.ts` | Tailwind CSS customization |
| `components.json` | shadcn-ui configuration |
| `tsconfig.json` | TypeScript compiler options |
| `supabase/config.toml` | Supabase project configuration |
| `.env` | Environment variables (not committed) |

## Working with This Codebase

### Adding a New Feature
1. Create types/interfaces if needed
2. Add database tables/columns in Supabase (regenerate types after)
3. Create/modify components in `src/components/`
4. Add hooks if complex logic needed in `src/hooks/`
5. Update Dashboard or routing as needed
6. Use TanStack Query for data fetching

### Adding a New Ladder Type
1. Update `ladders` table type enum in Supabase
2. Regenerate types
3. Update ladder creation form in `AddLadderDialog.tsx`
4. Add any type-specific logic in ladder components

### Debugging Supabase Issues
- Check browser DevTools Network tab for failed requests
- Verify RLS policies in Supabase dashboard
- Check auth state with `supabase.auth.getUser()`
- Review error codes (PGRST116 = not found, 23505 = unique violation)

## Project Metadata

- **Project Name:** vite_react_shadcn_ts (internal)
- **Display Name:** Tennis Ladder
- **Lovable Project URL:** https://lovable.dev/projects/7e0764c4-a686-4595-a612-433ab6e9e5e7
- **Supabase Project ID:** kpizlvfvwazvpkuncxfq
