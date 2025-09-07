import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kpizlvfvwazvpkuncxfq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwaXpsdmZ2d2F6dnBrdW5jeGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxOTM0MzEsImV4cCI6MjA3MTc2OTQzMX0.jOgObL_QINkmaz1jqpiOhx3HyU0Nooh8R1wSTkOTA3w"; // Anon key from client file

// Create Supabase client with anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupAdminProfile() {
  try {
    console.log("🔍 Checking existing clubs...");
    
    // First, check what clubs exist
    const { data: clubs, error: clubsError } = await supabase
      .from('clubs')
      .select('*');
    
    if (clubsError) {
      console.error("❌ Error fetching clubs:", clubsError);
      return;
    }
    
    console.log("📋 Available clubs:", clubs);
    
    // Check if the specific club exists
    const targetClub = clubs.find(club => club.id === '52fbcf8d-18da-45a6-9c95-4c890c3e9dda');
    if (!targetClub) {
      console.error("❌ Target club not found!");
      return;
    }
    
    console.log("🎯 Target club:", targetClub);
    
    // Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', '6e522e04-1def-4a57-ae87-a26e91299bbb')
      .single();
    
    if (existingProfile) {
      console.log("✅ Profile already exists:", existingProfile);
      return;
    }
    
    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error("❌ Error checking profile:", profileCheckError);
      return;
    }
    
    console.log("➕ Creating admin profile...");
    
    // Create the profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          user_id: '6e522e04-1def-4a57-ae87-a26e91299bbb',
          club_id: '52fbcf8d-18da-45a6-9c95-4c890c3e9dda',
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@example.com',
          elo_rating: 1200,
          matches_played: 0,
          matches_won: 0
        }
      ])
      .select()
      .single();
    
    if (createError) {
      console.error("❌ Error creating profile:", createError);
      return;
    }
    
    console.log("✅ Profile created successfully:", newProfile);
    
    // Verify admin role exists
    console.log("🔍 Checking admin role...");
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', '6e522e04-1def-4a57-ae87-a26e91299bbb')
      .eq('club_id', '52fbcf8d-18da-45a6-9c95-4c890c3e9dda');
    
    if (roleError) {
      console.error("❌ Error checking admin role:", roleError);
      return;
    }
    
    console.log("👑 Admin roles found:", adminRole);
    
    if (adminRole.length === 0) {
      console.log("➕ Creating admin role...");
      const { data: newRole, error: roleCreateError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: '6e522e04-1def-4a57-ae87-a26e91299bbb',
            club_id: '52fbcf8d-18da-45a6-9c95-4c890c3e9dda',
            role: 'club_admin'
          }
        ]);
      
      if (roleCreateError) {
        console.error("❌ Error creating admin role:", roleCreateError);
        return;
      }
      
      console.log("✅ Admin role created successfully!");
    }
    
    console.log("🎉 Setup complete! You should now see admin features.");
    
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

setupAdminProfile();
