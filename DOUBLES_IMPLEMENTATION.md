# Doubles Match Support Implementation

## Overview
Implemented **Option 1**: Individual doubles ELO system where players join doubles ladders individually and can partner with anyone.

## How It Works

### Singles Matches
- 2 players compete
- Individual `singles_elo` updated for each player
- Match recorded with just player1_id and player2_id

### Doubles Matches
- 4 players compete (2 teams of 2)
- **Team ELO Calculation:**
  - Team 1 ELO = average of (Player 1 + Player 1 Partner)
  - Team 2 ELO = average of (Player 2 + Player 2 Partner)
- **Individual Updates:** Each of the 4 players gets their `doubles_elo` updated
- Match recorded with all 4 player IDs

### ELO Calculation Example
```
Team 1: John (1400) + Mike (1500) = Avg 1450
Team 2: Bob (1300) + Tom (1350) = Avg 1325

Team 1 wins → All expected to win
- John: 1400 → 1408 (+8)
- Mike: 1500 → 1508 (+8)
- Bob: 1300 → 1292 (-8)
- Tom: 1350 → 1342 (-8)
```

## What's Been Done ✅

### 1. Database Migration
- **File**: `supabase/migrations/add_partner_fields_to_matches.sql`
- Added columns to `matches` table:
  - `player1_partner_id` (nullable)
  - `player2_partner_id` (nullable)
  - `player1_partner_elo_before/after`
  - `player2_partner_elo_before/after`

### 2. UI Updates
- **File**: `src/components/RecordMatchDialog.tsx`
- Added partner selection dropdowns (only shown for doubles/mixed ladders)
- Added validation to ensure player ≠ partner
- Form now includes `player1PartnerId` and `player2PartnerId`

### 3. Backend Logic
- **File**: `src/hooks/useRecordMatch.ts`
- Validates all 4 players are ladder participants (for doubles)
- Calculates team average ELOs
- Updates individual doubles ELO for all 4 players
- Updates match counts for all 4 players
- Records match with all partner IDs and ELOs

## What You Need to Do ⚠️

### 1. Run Database Migrations (REQUIRED)
```bash
# Run BOTH migrations in order:
# 1. Singles/Doubles ELO separation
# 2. Partner fields for doubles

supabase db push
```

Or manually run:
1. `supabase/migrations/add_singles_doubles_elo.sql`
2. `supabase/migrations/add_partner_fields_to_matches.sql`

### 2. Update TypeScript Types
Add to `src/integrations/supabase/types.ts` matches table:
```typescript
matches: {
  Row: {
    // ... existing fields ...
    player1_partner_id: string | null
    player2_partner_id: string | null
    player1_partner_elo_before: number | null
    player1_partner_elo_after: number | null
    player2_partner_elo_before: number | null
    player2_partner_elo_after: number | null
  }
}
```

### 3. Test Thoroughly

#### Singles Match Test:
1. Join a singles ladder
2. Record a match (2 players only)
3. Verify singles_elo updates for both players
4. Verify doubles_elo unchanged

#### Doubles Match Test:
1. Join a doubles ladder (4 players minimum needed)
2. Record a match → select all 4 players (2 teams)
3. Verify all 4 players' doubles_elo updates
4. Verify singles_elo unchanged
5. Check match history shows all 4 players

## Ladder Display

Both singles and doubles ladders show **individual player rankings**:

### Singles Ladder
```
Rank  Player      Singles ELO  Matches
1     John Smith     1450      12
2     Mike Jones     1420      15
```

### Doubles Ladder
```
Rank  Player      Doubles ELO  Matches
1     John Smith     1520      8
2     Bob Wilson     1480      10
3     Mike Jones     1460      12
```

**Note:** Players can have different rankings in singles vs doubles!

## Match History Display

### Singles Match
```
John Smith def. Mike Jones 2-0
Oct 16, 2025
```

### Doubles Match
```
Smith/Wilson def. Jones/Garcia 2-1
Oct 16, 2025
```

## Key Benefits ✨

- ✅ Players can partner with different people
- ✅ Tracks individual doubles ability across all partnerships
- ✅ Simple to manage - players join individually
- ✅ Accurate ELO - accounts for partner strength via team averages
- ✅ Same ladder UI for both singles and doubles
