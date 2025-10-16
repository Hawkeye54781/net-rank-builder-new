# Singles/Doubles ELO Separation Implementation

## What's Been Done ✅

### 1. Database Migration Created
- **File**: `supabase/migrations/add_singles_doubles_elo.sql`
- Adds `singles_elo`, `doubles_elo` fields to profiles
- Adds `singles_matches_played/won`, `doubles_matches_played/won` counters
- Migrates existing data to `singles_elo` (assumes current system is singles-focused)
- Keeps legacy columns for backwards compatibility

### 2. useRecordMatch Hook Updated
- **File**: `src/hooks/useRecordMatch.ts`
- Now fetches ladder type to determine if match is singles or doubles
- Uses appropriate ELO field (`singles_elo` or `doubles_elo`)
- Updates appropriate match counters based on ladder type
- Maintains backwards compatibility with legacy fields

## What Needs To Be Done Next 📋

### 1. Run Database Migration ⚠️ REQUIRED
```bash
# Connect to your Supabase project and run the migration
# The migration file is: supabase/migrations/add_singles_doubles_elo.sql
# Or use Supabase CLI:
supabase db push
```

### 2. ✅ Update TypeScript Types - COMPLETE
`src/integrations/supabase/types.ts` has been updated to include:
- `singles_elo`, `doubles_elo`
- `singles_matches_played`, `singles_matches_won`
- `doubles_matches_played`, `doubles_matches_won`

### 3. ✅ Update UI Components - COMPLETE

All components have been updated:
- ✅ `src/pages/LadderDetails.tsx` - Shows appropriate ELO based on ladder type
- ✅ `src/pages/UserProfile.tsx` - Displays both singles and doubles ELO
- ✅ `src/components/RecordMatchDialog.tsx` - Player dropdown shows correct ELO
- ✅ `src/components/Dashboard.tsx` - Club rankings use singles ELO
- ✅ `src/components/LadderParticipants.tsx` - Shows appropriate ELO
- ✅ `src/hooks/useRecordMatch.ts` - Updates correct ELO based on ladder type

### 4. Test After Migration 🧪

After running the database migration, test these scenarios:
- Record a singles match → singles_elo updates, doubles_elo unchanged
- Record a doubles match → doubles_elo updates, singles_elo unchanged  
- View player profile → both ELOs displayed correctly
- View singles ladder → sorted by singles_elo
- View doubles ladder → sorted by doubles_elo
- Player dropdown in match recording shows correct ELO based on selected ladder

## How It Works 🎾

### Singles Matches
- Recorded on ladders with `type = 'singles'`
- Updates: `singles_elo`, `singles_matches_played`, `singles_matches_won`
- Does NOT affect doubles ratings

### Doubles/Mixed Matches
- Recorded on ladders with `type = 'doubles'` or `type = 'mixed'`
- Updates: `doubles_elo`, `doubles_matches_played`, `doubles_matches_won`
- Does NOT affect singles ratings

### Player Stats
Each player now has:
- Singles ELO (default: 1200)
- Doubles ELO (default: 1200)
- Separate match counters for each type
- Legacy fields maintained for compatibility

## Benefits 🎯

1. **Independence**: Singles and doubles performance tracked separately
2. **Accuracy**: Doubles teamwork doesn't affect individual singles ranking
3. **Simplicity**: One ELO per match type across all ladders
4. **Backwards Compatible**: Legacy fields preserved during transition
