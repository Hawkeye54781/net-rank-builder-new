# Environment Setup - Dev/Test & Production

## Overview
This project uses Docker for local development and Supabase Cloud for production.

## Environments

### 🐳 Local Development (Docker - Current)
- **Type**: Docker containers (via Supabase CLI)
- **URL**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Use Case**: Local development and testing
- **Configuration File**: `.env` (active for localhost)
- **Data**: Isolated, can be reset anytime with `supabase db reset`

### 🚀 Production Environment (Cloud)
- **Project ID**: `kpizlvfvwazvpkuncxfq`
- **Project Name**: Tennis Club Ladder
- **URL**: https://kpizlvfvwazvpkuncxfq.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/kpizlvfvwazvpkuncxfq
- **Use Case**: Live production application
- **Configuration File**: `.env.production` (backup reference)

### 🧪 Cloud Test Environment (Optional)
- **Project ID**: `hftadlemirrdkdnnoahk`
- **Project Name**: Tennis Club Ladder Test
- **URL**: https://hftadlemirrdkdnnoahk.supabase.co
- **Use Case**: Cloud-based testing/staging (optional)
- **Configuration File**: `.env.test`

## Configuration Files

### `.env` - Local Development (Active)
Currently points to **Docker local development**. This is used when running the app locally.

```env
VITE_SUPABASE_PROJECT_ID="local"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
VITE_SUPABASE_URL="http://127.0.0.1:54321"
```

### `.env.production` - Production Backup
Contains production credentials for reference. Use these when you need to deploy to production.

```env
VITE_SUPABASE_PROJECT_ID="kpizlvfvwazvpkuncxfq"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbG..."
VITE_SUPABASE_URL="https://kpizlvfvwazvpkuncxfq.supabase.co"
```

### `.env.test` - Cloud Test Backup
Contains cloud test environment credentials (optional).

```env
VITE_SUPABASE_PROJECT_ID="hftadlemirrdkdnnoahk"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbG..."
VITE_SUPABASE_URL="https://hftadlemirrdkdnnoahk.supabase.co"
```

## Database Schema

Both environments have the same schema structure with these tables:
- `clubs` - Tennis clubs
- `profiles` - User profiles
- `ladders` - Competition ladders
- `ladder_participants` - Players in ladders
- `matches` - Match records
- `user_roles` - Club admin permissions
- `subscription_plans` - Billing plans
- `club_subscriptions` - Club billing info
- `yearly_winners` - Annual champions

The test database includes sample data from migrations:
- "Carrickmacross Tennis Club" club
- 3 subscription plans (Basic, Premium, Enterprise)

## Working with Environments

### Local Development (Default)
```bash
# Make sure Docker is running
# Start local Supabase (if not already running)
supabase start

# Run your app
npm run dev

# Access Supabase Studio (database UI)
# Open: http://127.0.0.1:54323
```

### Resetting Local Database
```bash
# Reset and reapply all migrations (fresh start)
supabase db reset

# This will:
# - Drop all data
# - Reapply all migrations from scratch
# - Perfect for testing migrations or starting fresh
```

### Deploying to Production
```bash
# 1. Copy production credentials to .env
Copy-Item .env.production .env

# 2. Build your app
npm run build

# 3. Deploy (e.g., to Vercel, Netlify, etc.)
# Make sure to set environment variables in your hosting platform

# 4. Switch back to local dev
Copy-Item .env.example .env
# Then update with local Docker credentials
```

### Creating and Applying Migrations

```bash
# Create a new migration
supabase migration new your_migration_name

# Edit the generated .sql file in supabase/migrations/

# Apply to local database
supabase db reset  # Reapplies all migrations
# OR
supabase migration up  # Applies only new migrations

# When ready for production, apply to production database
supabase link --project-ref kpizlvfvwazvpkuncxfq
supabase db push
```

## Getting Started with Local Development

Your local database has the schema and sample clubs from migrations. To get started:

1. **Start Supabase** (if not running): `supabase start`
2. **Run your app**: `npm run dev`
3. **Sign up** through your app's auth flow (creates profile automatically via trigger)
4. **Create test data** (ladders, matches) as needed
5. **Reset database anytime**: `supabase db reset` for a fresh start

## Important Notes

⚠️ **Never commit `.env` files to version control!** - `.env`, `.env.production`, and `.env.test` are gitignored

🐳 **Docker Required** - Local development requires Docker Desktop to be running

🔄 **Fresh Start Anytime** - Use `supabase db reset` to wipe local data and reapply migrations

⚠️ **Production is Sacred** - Local Docker changes never affect production data

## Quick Reference

| Action | Command |
|--------|---------|  
| Start local Supabase | `supabase start` |
| Stop local Supabase | `supabase stop` |
| Reset local database | `supabase db reset` |
| View local status | `supabase status` |
| Open Supabase Studio | `http://127.0.0.1:54323` |
| Create migration | `supabase migration new <name>` |
| Apply to production | `supabase link --project-ref kpizlvfvwazvpkuncxfq && supabase db push` |
| View local logs | `supabase logs` |
