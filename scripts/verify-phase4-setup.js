#!/usr/bin/env node

/**
 * Phase 4 Migration Verification Script
 * 
 * This script verifies that the Phase 4 migration completed successfully
 * by checking for required tables using Supabase client.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from frontend/.env.local
const envPath = join(__dirname, '../frontend/.env.local');
const envFile = readFileSync(envPath, 'utf-8');

// Parse environment variables
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing Supabase credentials in frontend/.env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tables to check
const requiredTables = [
  'products',
  'orders',
  'order_items',
  'payments',
  'notifications',
  'order_messages'
];

// Columns to check in products table
const requiredProductColumns = [
  'stock_quantity',
  'low_stock_threshold'
];

// Columns to check in orders table
const requiredOrderColumns = [
  'order_number',
  'delivery_address'
];

async function checkTableExists(tableName) {
  try {
    // Try to query the table (with limit 0 to avoid fetching data)
    const { error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    if (error) {
      // If error code is 42P01, table doesn't exist
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return false;
      }
      // Other errors might be permission-related, but table exists
      if (error.code === '42501' || error.message.includes('permission')) {
        return true; // Table exists but we don't have permission
      }
      throw error;
    }
    return true;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    // Try to select the column (with limit 0)
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(0);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        return false;
      }
      // Permission errors mean column might exist
      return error.code === '42501';
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying Phase 4 Database Migration...\n');
  console.log(`📊 Supabase URL: ${SUPABASE_URL}\n`);

  let allPassed = true;
  const results = [];

  // Check tables
  console.log('📋 Checking tables...');
  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    results.push({ type: 'table', name: table, exists });
    
    if (exists) {
      console.log(`  ✅ Table "${table}" exists`);
    } else {
      console.log(`  ❌ Table "${table}" does not exist`);
      allPassed = false;
    }
  }

  // Check product columns
  console.log('\n📋 Checking products table columns...');
  for (const column of requiredProductColumns) {
    const exists = await checkColumnExists('products', column);
    results.push({ type: 'column', table: 'products', name: column, exists });
    
    if (exists) {
      console.log(`  ✅ Column "products.${column}" exists`);
    } else {
      console.log(`  ❌ Column "products.${column}" does not exist`);
      allPassed = false;
    }
  }

  // Check order columns
  console.log('\n📋 Checking orders table columns...');
  for (const column of requiredOrderColumns) {
    const exists = await checkColumnExists('orders', column);
    results.push({ type: 'column', table: 'orders', name: column, exists });
    
    if (exists) {
      console.log(`  ✅ Column "orders.${column}" exists`);
    } else {
      console.log(`  ❌ Column "orders.${column}" does not exist`);
      allPassed = false;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ Migration verification complete! All checks passed.');
    console.log('\n📝 Next steps:');
    console.log('1. Generate TypeScript types:');
    console.log('   cd frontend && npx supabase gen types typescript --linked > src/integrations/supabase/types.ts');
    console.log('2. Test the application:');
    console.log('   cd frontend && npm run dev');
    console.log('3. Verify hooks work with real data');
  } else {
    console.log('⚠️  Some checks failed. Migration may not be complete.');
    console.log('\n💡 To complete the migration:');
    console.log('1. Open your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor → New Query');
    console.log('3. Run docs/database/migrations/phase4-migration.sql');
    console.log('\n📚 For detailed instructions, see:');
    console.log('   docs/database/database-overview.md');
  }
  console.log('='.repeat(60) + '\n');

  return allPassed;
}

verifyMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

