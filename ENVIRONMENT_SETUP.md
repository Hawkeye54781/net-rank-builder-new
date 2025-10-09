# Environment Setup - Dev/Test & Production

## Overview
This project now has separate Supabase environments for development/testing and production.

## Environments

### 🧪 Development/Test Environment (Current for localhost)
- **Project ID**: `hftadlemirrdkdnnoahk`
- **Project Name**: Tennis Club Ladder Test
- **URL**: https://hftadlemirrdkdnnoahk.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/hftadlemirrdkdnnoahk
- **Use Case**: Local development and testing
- **Configuration File**: `.env` (active for localhost)

### 🚀 Production Environment
- **Project ID**: `kpizlvfvwazvpkuncxfq`
- **Project Name**: Tennis Club Ladder
- **URL**: https://kpizlvfvwazvpkuncxfq.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/kpizlvfvwazvpkuncxfq
- **Use Case**: Live production application
- **Configuration File**: `.env.production` (backup reference)

## Configuration Files

### `.env` - Development (Active)
Currently points to the **test environment**. This is used when running the app locally.

```env
VITE_SUPABASE_PROJECT_ID="hftadlemirrdkdnnoahk"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbG..."
VITE_SUPABASE_URL="https://hftadlemirrdkdnnoahk.supabase.co"
```

### `.env.production` - Production Backup
Contains production credentials for reference. Use these when you need to deploy to production.

```env
VITE_SUPABASE_PROJECT_ID="kpizlvfvwazvpkuncxfq"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbG..."
VITE_SUPABASE_URL="https://kpizlvfvwazvpkuncxfq.supabase.co"
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

### Switching to Test Environment (for local dev)
```bash
# Already configured! Just use:
npm run dev
```

### Switching to Production (for deployment)
```bash
# Copy production credentials to .env
Copy-Item .env.production .env

# Or on Unix/Mac:
# cp .env.production .env
```

### Switching Supabase CLI Context
```bash
# Link to test
supabase link --project-ref hftadlemirrdkdnnoahk

# Link to production
supabase link --project-ref kpizlvfvwazvpkuncxfq
```

### Applying New Migrations

When you create new migrations, apply them to both environments:

```bash
# Apply to test (currently linked)
supabase db push

# Switch to production and apply
supabase link --project-ref kpizlvfvwazvpkuncxfq
supabase db push

# Switch back to test
supabase link --project-ref hftadlemirrdkdnnoahk
```

## Getting Started with Test Environment

The test database has the schema but no user data. To get started:

1. **Run your app locally**: `npm run dev`
2. **Sign up** through your app's auth flow
3. **Create test data** (clubs, ladders, matches) as needed

## Important Notes

⚠️ **Never commit `.env` files to version control!** - Make sure `.env` and `.env.production` are in `.gitignore`

⚠️ **Free Tier Limits** - Both projects are on Supabase free tier. Monitor usage in the dashboards.

⚠️ **Data Isolation** - Changes in test won't affect production and vice versa.

## Quick Reference

| Action | Command |
|--------|---------|
| View all projects | `supabase projects list` |
| Check current link | `supabase projects list` (look for ●) |
| Link to test | `supabase link --project-ref hftadlemirrdkdnnoahk` |
| Link to prod | `supabase link --project-ref kpizlvfvwazvpkuncxfq` |
| Apply migrations | `supabase db push` |
| View API keys | `supabase projects api-keys` |
