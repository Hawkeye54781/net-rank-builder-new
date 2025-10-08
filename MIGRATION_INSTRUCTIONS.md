# Club Admin Management Migration Instructions

## Overview
This feature allows club admins to add and remove other club members as admins.

## Database Migration

The migration file is located at:
`supabase/migrations/20251008203458_add_club_admin_management_policies.sql`

### To Apply the Migration to Remote Supabase:

1. Open the Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project: `kpizlvfvwazvpkuncxfq`
3. Go to the SQL Editor
4. Copy and paste the contents of the migration file
5. Execute the SQL

### Migration Contents:
- Drops the existing broad "Club admins can manage roles in their club" policy
- Adds three specific policies:
  - `Club admins can view roles in their club` - Allows viewing all admin roles
  - `Club admins can add admins in their club` - Allows promoting members to admin
  - `Club admins can remove admins in their club` - Allows demoting admins

## Component Changes

### New Component: `ClubAdminManagement.tsx`
Located at: `src/components/ClubAdminManagement.tsx`

Features:
- Lists all club members
- Shows admin badge for current admins
- "Make Admin" button for non-admin members
- "Remove Admin" button for admin members (disabled for current user)
- Confirmation dialogs for promote/demote actions
- Loading states and error handling

### Updated Component: `Dashboard.tsx`
Added a new "Club Admin Management" card in the Admin tab that:
- Only appears for club admins (uses `isAdmin` check)
- Displays the ClubAdminManagement component
- Follows the same pattern as the existing Ladder Management card

## Testing the Feature

1. Log in as a club admin
2. Navigate to the Admin tab
3. Scroll down to see the "Club Admin Management" section
4. You should see:
   - A list of all club members
   - Admin badges next to members who are already admins
   - "Make Admin" button for regular members
   - "Remove Admin" button for admins (disabled for yourself)
5. Test promoting a member to admin
6. Test demoting an admin (not yourself)

## Notes

- Admins cannot remove their own admin privileges (prevents lockout)
- All actions have confirmation dialogs to prevent accidental changes
- Toast notifications provide feedback on success/failure
- The component fetches fresh data after each operation
- Follows the same patterns as `LadderManagement.tsx` for consistency
