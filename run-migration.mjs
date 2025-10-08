import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kpizlvfvwazvpkuncxfq.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwaXpsdmZ2d2F6dnBrdW5jeGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxOTM0MzEsImV4cCI6MjA3MTc2OTQzMX0.jOgObL_QINkmaz1jqpiOhx3HyU0Nooh8R1wSTkOTA3w';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('./supabase/migrations/20251008203458_add_club_admin_management_policies.sql', 'utf8');

console.log('Executing migration SQL...');
console.log(sql);
console.log('\n---\n');

// Split by semicolon and execute each statement
const statements = sql.split(';').filter(s => s.trim().length > 0);

for (const statement of statements) {
  const trimmed = statement.trim();
  if (trimmed) {
    console.log(`Executing: ${trimmed.substring(0, 80)}...`);
    const { data, error } = await supabase.rpc('exec_sql', { query: trimmed });
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success!');
    }
  }
}

console.log('\nMigration complete!');
