#!/usr/bin/env node

/**
 * Phase 4 Migration Runner
 * 
 * This script helps run the Phase 4 database migration using Supabase REST API.
 * 
 * Note: This requires the Supabase service role key for direct SQL execution.
 * Alternative: Run the migration directly in Supabase Dashboard → SQL Editor
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  console.log('\n📝 To run this script:');
  console.log('1. Set VITE_SUPABASE_URL to your Supabase project URL');
  console.log('2. Set SUPABASE_SERVICE_ROLE_KEY to your service role key');
  console.log('3. Run: node scripts/run-phase4-migration.js');
  console.log('\n💡 Alternative: Run the migration directly in Supabase Dashboard → SQL Editor');
  console.log('   File: docs/database/migrations/phase4-migration.sql');
  process.exit(1);
}

// Read migration script
const migrationPath = join(__dirname, '../docs/database/migrations/phase4-migration.sql');
let migrationSQL;

try {
  migrationSQL = readFileSync(migrationPath, 'utf-8');
  console.log('✅ Migration script loaded');
} catch (error) {
  console.error('❌ Error reading migration script:', error.message);
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('\n🚀 Starting Phase 4 Database Migration...\n');

  try {
    // Split SQL into individual statements (basic splitting by semicolon)
    // Note: This is a simplified approach. For production, use a proper SQL parser.
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute migration using Supabase REST API
    // Note: Supabase doesn't have a direct SQL execution endpoint via REST API
    // This would require using the PostgREST or direct database connection
    console.log('⚠️  Direct SQL execution via REST API is not supported by Supabase');
    console.log('\n💡 Please run the migration using one of these methods:');
    console.log('\n1. Supabase Dashboard (Recommended):');
    console.log('   a. Open your Supabase project dashboard');
    console.log('   b. Navigate to SQL Editor → New Query');
    console.log('   c. Copy and paste the contents of docs/database/migrations/phase4-migration.sql');
    console.log('   d. Click "Run" or press Ctrl+Enter');
    console.log('\n2. Supabase CLI:');
    console.log('   a. Install Supabase CLI: npm install -g supabase');
    console.log('   b. Link your project: supabase link --project-ref <your-project-ref>');
    console.log('   c. Run the migration file from docs/database/migrations/');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();

