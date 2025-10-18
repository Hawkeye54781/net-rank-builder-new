# Tournament System Documentation

## Overview
This document outlines the tournament system implementation for the competitive tennis app. The system supports round-robin tournaments with multiple groups, guest players, and ELO integration.

## Features

### 1. Tournament Management (Admin)
- **Create Tournaments**: Name, format (round robin), date range, winner bonus ELO
- **Create Groups**: Multiple groups per tournament with level, gender, and match type (singles/doubles)
- **Add Participants**: Add club members or guest players to specific groups
- **Activate Tournaments**: Change status from draft → active to begin match recording
- **Complete Tournaments**: Automatically calculate winners and award bonus ELO
- **Record Matches**: Admins can record any match in the tournament

### 2. User Features
- **View Tournaments**: See all tournaments they're participating in
- **Detailed Standings**: View group standings with wins/losses/sets/games
- **Match History**: See all completed and pending matches
- **Record Matches**: Players can record their own matches in active tournaments

### 3. Guest Players
- **Temporary Profiles**: Guest players created for tournaments
- **No ELO Impact**: Matches against guests don't affect club member ELO
- **Auto Cleanup**: Guest profiles deleted 7 days after tournament completion
- **Historical Records**: Match records preserved showing "Guest" after deletion

### 4. ELO System Integration
- **Tournament Matches**: Regular matches affect ELO (unless guest involved)
- **Winner Bonus**: Group winners receive additional ELO points
- **Shared Rating**: Player ELO is consistent across ladders and tournaments

## Database Schema

### Tables

#### `tournaments`
- Core tournament information
- Fields: name, club_id, format, start_date, end_date, status, winner_bonus_elo

#### `tournament_groups`
- Groups within tournaments
- Fields: tournament_id, name, level, gender, match_type

#### `tournament_participants`
- Players in tournament groups
- Fields: tournament_id, group_id, player_id, is_guest, guest_name, guest_deleted_at

#### `tournament_matches`
- Match records
- Fields: tournament_id, group_id, player1_id, player2_id, sets, games, status, affects_elo

#### `tournament_winners`
- Final standings and bonus ELO awarded
- Fields: tournament_id, group_id, player_id, final_standing, wins, losses, sets_won, sets_lost, games_won, games_lost, bonus_elo_awarded

### Enums
- `tournament_status`: draft, active, completed
- `tournament_format`: round_robin (others can be added later)
- `match_gender`: mens, womens, mixed
- `match_type`: singles, doubles

## Component Architecture

### Admin Components
- `TournamentManagement.tsx` - Main admin interface with tabs for draft/active/completed
- `AddTournamentDialog.tsx` - Create new tournaments with groups
- `EditTournamentDialog.tsx` - Edit tournament details, add participants, record matches
- `RecordTournamentMatchDialog.tsx` - Record match results with group/participant selection

### User Components
- `UserTournamentsList.tsx` - View user's tournaments (draft/active/completed tabs)
- `TournamentDetailsDialog.tsx` - Detailed view with standings tables and match history

### Hooks
- `useRecordTournamentMatch.ts` - Record matches with ELO calculation
- `useCompleteTournament.ts` - Calculate winners and award bonus ELO
- `useUserTournaments.ts` - Fetch tournaments user is participating in
- `useTournamentDetails.ts` - Fetch full tournament details with standings

## Tournament Workflow

### 1. Creation (Draft Status)
1. Admin creates tournament with name, dates, format, bonus ELO
2. Admin adds groups (e.g., "Men's Singles A", "Women's Doubles B")
3. Admin adds participants (club members or guests) to each group

### 2. Activation (Active Status)
1. Admin activates tournament (draft → active)
2. Players can now record matches
3. Both players and admins can record match results
4. ELO automatically updates after each match (if not against guest)

### 3. Completion (Completed Status)
1. Admin completes tournament
2. System calculates standings for each group:
   - Points: 2 for win, 1 for loss
   - Tiebreaker: Sets difference, then games difference
3. Winner of each group receives bonus ELO
4. Tournament marked as completed

### 4. Guest Cleanup (7 days after completion)
1. Edge function runs daily (via cron)
2. Finds completed tournaments older than 7 days
3. Marks guest participants with `guest_deleted_at` timestamp
4. Deletes guest profiles from database
5. Match records preserved showing "Guest"

## Edge Functions

### `cleanup-tournament-guests`
- **Purpose**: Remove guest player profiles 7 days after tournament completion
- **Trigger**: Should be set up as a cron job (daily at midnight recommended)
- **Deploy**: `supabase functions deploy cleanup-tournament-guests`

#### Setting up Cron Job
You have two options:

**Option 1: Supabase Dashboard**
1. Go to Database → Cron Jobs
2. Create new job: `cleanup_guests`
3. Schedule: `0 0 * * *` (daily at midnight)
4. Function: Call the edge function via HTTP

**Option 2: pg_cron SQL**
```sql
SELECT cron.schedule(
  'cleanup-tournament-guests',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT net.http_post(
    url:='https://your-project-ref.supabase.co/functions/v1/cleanup-tournament-guests',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

## RLS Policies

### Participants
- Read: Club members can see participants in their club's tournaments
- Write: Admins only (add/remove participants)

### Matches
- Read: Participants can see matches in groups they're in
- Write: Participants can record matches they're involved in, admins can record any match

### Tournaments/Groups
- Read: Club members can see their club's tournaments
- Write: Admins only

## ELO Calculation

### Match ELO (K_FACTOR = 32)
```typescript
expectedScore = 1 / (1 + 10^((opponentElo - playerElo) / 400))
newElo = oldElo + K_FACTOR * (actualScore - expectedScore)
```

### Winner Bonus
- Applied to group winner only (1st place)
- Direct addition to player's ELO
- Set per tournament (e.g., +50 ELO)

### Conditions
- ELO only changes when `affects_elo = true`
- Automatically set to `false` when guest is involved
- Both match ELO and winner bonus only apply to club members

## Mobile-First Design

All components use responsive design:
- `sm:` breakpoint for tablets (640px+)
- `md:` breakpoint for desktops (768px+)
- Touch-friendly tap targets (min 44px)
- Scrollable tables on mobile
- Collapsible navigation
- Optimized font sizes (text-xs on mobile, text-sm on tablet+)

## Current Status

**Completed** (11/15 tasks - 73%):
- ✅ Database schema and migrations
- ✅ RLS policies
- ✅ TypeScript types
- ✅ Tournament ELO calculation
- ✅ Admin tournament management
- ✅ Participant management
- ✅ Match recording
- ✅ Tournament activation
- ✅ Tournament completion with winner calculation
- ✅ User tournament views
- ✅ Guest player cleanup edge function

**Remaining**:
- Mobile responsiveness review
- Validation & error handling polish
- Testing & documentation
- Additional tournament formats (single elimination, etc.)

## Future Enhancements

1. **Additional Formats**
   - Single elimination
   - Double elimination
   - Swiss system

2. **Advanced Features**
   - Seeding based on ELO
   - Automated scheduling
   - Live leaderboards
   - Push notifications for matches
   - Tournament brackets visualization

3. **Reporting**
   - Tournament statistics
   - Player performance analytics
   - Export to PDF/CSV

4. **Social Features**
   - Tournament comments/chat
   - Share results to social media
   - Tournament photos/gallery

## Testing Checklist

### Admin Flow
- [ ] Create tournament with multiple groups
- [ ] Add club members to groups
- [ ] Add guest players
- [ ] Activate tournament
- [ ] Record matches (admin)
- [ ] Edit match results
- [ ] Complete tournament
- [ ] Verify winner bonus ELO awarded

### User Flow
- [ ] View tournaments list
- [ ] Click tournament to see details
- [ ] View standings table
- [ ] View match history
- [ ] Record own match
- [ ] Verify ELO updated

### Guest Cleanup
- [ ] Complete tournament
- [ ] Wait 7 days (or manually trigger function)
- [ ] Verify guests marked as deleted
- [ ] Verify match records show "Guest"

### Edge Cases
- [ ] Tournament with no participants
- [ ] Tournament with no matches
- [ ] Match against guest (verify no ELO change)
- [ ] Multiple winners in different groups
- [ ] Ties in standings

## Support

For issues or questions:
1. Check the console for error messages
2. Verify RLS policies in Supabase dashboard
3. Check edge function logs
4. Review migration files for schema changes
