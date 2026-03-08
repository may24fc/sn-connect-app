#!/usr/bin/env node

/**
 * Script: Check onboarding data for test accounts
 * Purpose: Verify if employee@example.com and intern@example.com have onboarding profiles
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  });
} catch (error) {
  console.error('⚠️  Could not load .env.local:', error.message);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔍 Checking onboarding data for test accounts...\n');

// First, fetch the auth users
const authUsersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  headers: {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
});

if (!authUsersResponse.ok) {
  console.error('❌ Failed to fetch auth users:', authUsersResponse.statusText);
  const errorData = await authUsersResponse.text();
  console.error(errorData);
  process.exit(1);
}

const authUsersData = await authUsersResponse.json();
const authUsers = authUsersData.users || [];

const testUsers = authUsers.filter(
  (u) => u.email === 'employee@example.com' || u.email === 'intern@example.com'
);

if (testUsers.length === 0) {
  console.error('❌ No auth users found for employee@example.com or intern@example.com');
  process.exit(1);
}

const userIds = testUsers.map((u) => u.id);

// Fetch public.users to get roles
const publicUsersResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/users?select=id,role&id=in.(${userIds.join(',')})`,
  {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);

const publicUsers = await publicUsersResponse.json();

// Fetch onboarding profiles for these users
const profilesResponse = await fetch(
  `${SUPABASE_URL}/rest/v1/onboarding_profiles?select=*,departments(id,name)&user_id=in.(${userIds.join(',')})`,
  {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);

if (!profilesResponse.ok) {
  console.error('❌ Failed to fetch onboarding profiles:', profilesResponse.statusText);
  const errorData = await profilesResponse.text();
  console.error(errorData);
  process.exit(1);
}

const profiles = await profilesResponse.json();

console.log('═'.repeat(80));
console.log('ONBOARDING PROFILES FOR TEST ACCOUNTS');
console.log('═'.repeat(80));

if (!Array.isArray(profiles) || profiles.length === 0) {
  console.log('\n❌ No onboarding profiles found for employee@example.com or intern@example.com');
  console.log('\nℹ️  Test accounts need to complete the onboarding wizard first.');
  if (!Array.isArray(profiles)) {
    console.log('\n⚠️  Unexpected response format:', profiles);
  }
} else {
  console.log(`\n✅ Found ${profiles.length} onboarding profile(s):\n`);

  for (const profile of profiles) {
    const authUser = testUsers.find((u) => u.id === profile.user_id);
    const publicUser = publicUsers.find((u) => u.id === profile.user_id);
    const fullName = [profile.first_name, profile.middle_name, profile.last_name]
      .filter(Boolean)
      .join(' ');

    console.log(`📧 ${authUser?.email || 'Unknown email'}`);
    console.log(`   Role: ${publicUser?.role || 'N/A'}`);
    console.log(`   Name: ${fullName || 'Not provided'}`);
    console.log(`   Status: ${profile.is_completed ? '✅ Completed' : '⏳ In Progress'}`);
    console.log(`   Current Step: ${profile.current_step || 'N/A'}`);
    console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
    if (profile.completed_at) {
      console.log(`   Completed At: ${new Date(profile.completed_at).toLocaleString()}`);
    }
    console.log();
  }
}

console.log('═'.repeat(80));
