#!/usr/bin/env node

/**
 * Admin Invite Script — Create portal users and grant access
 *
 * Usage:
 *   node scripts/admin-invite.js --email user@example.com --password temp123 --portal client
 *   node scripts/admin-invite.js --email investor@example.com --password temp456 --portal investor
 *   node scripts/admin-invite.js --email user@example.com --revoke --portal client
 *   node scripts/admin-invite.js --list --portal client
 *
 * Environment variables required:
 *   SUPABASE_URL          — Your Supabase project URL
 *   SUPABASE_SERVICE_KEY  — Service role key (NOT the anon key)
 */

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return null;
  return args[idx + 1] || true;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  process.exit(1);
}

const email = getArg('email');
const password = getArg('password');
const portalType = getArg('portal');
const shouldRevoke = args.includes('--revoke');
const shouldList = args.includes('--list');

const headers = {
  'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
  'apikey': SUPABASE_SERVICE_KEY,
  'Content-Type': 'application/json'
};

async function request(path, options = {}) {
  const res = await fetch(SUPABASE_URL + path, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function listUsers(portal) {
  const accessList = await request(
    '/rest/v1/portal_access?portal_type=eq.' + portal + '&revoked_at=is.null&select=user_id,granted_at'
  );

  if (accessList.length === 0) {
    console.log('No active ' + portal + ' portal users.');
    return;
  }

  console.log('\nActive ' + portal + ' portal users:');
  for (const entry of accessList) {
    const profile = await request(
      '/rest/v1/profiles?id=eq.' + entry.user_id + '&select=email,first_name,last_name'
    );
    const p = profile[0] || {};
    console.log('  ' + (p.email || entry.user_id) + ' — ' + (p.first_name || '') + ' ' + (p.last_name || '') + ' (since ' + entry.granted_at + ')');
  }
}

async function inviteUser(email, password, portal) {
  // Create user via admin API
  let user;
  try {
    const result = await request('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        password: password,
        email_confirm: true
      })
    });
    user = result;
    console.log('Created user: ' + email);
  } catch (err) {
    // User may already exist — try to find them
    const users = await request('/auth/v1/admin/users?page=1&per_page=50');
    user = users.users.find(function(u) { return u.email === email; });
    if (!user) throw new Error('Could not find or create user: ' + email);
    console.log('User already exists: ' + email);
  }

  // Ensure profile exists
  await request('/rest/v1/profiles', {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id: user.id,
      email: email,
      member_state: 'active',
      role: portal,
      member_since: new Date().toISOString()
    })
  });

  // Grant portal access
  await request('/rest/v1/portal_access', {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: user.id,
      portal_type: portal,
      granted_at: new Date().toISOString()
    })
  });

  console.log('Granted ' + portal + ' portal access to ' + email);
  console.log('Temporary password: ' + password);
  console.log('Send credentials to the user and ask them to change their password.');
}

async function revokeUser(email, portal) {
  // Find user
  const users = await request('/auth/v1/admin/users?page=1&per_page=50');
  const user = users.users.find(function(u) { return u.email === email; });
  if (!user) {
    console.error('User not found: ' + email);
    process.exit(1);
  }

  // Revoke portal access
  await request(
    '/rest/v1/portal_access?user_id=eq.' + user.id + '&portal_type=eq.' + portal + '&revoked_at=is.null',
    {
      method: 'PATCH',
      body: JSON.stringify({ revoked_at: new Date().toISOString() })
    }
  );

  console.log('Revoked ' + portal + ' portal access for ' + email);
}

async function main() {
  try {
    if (shouldList) {
      if (!portalType) { console.error('Specify --portal (client or investor)'); process.exit(1); }
      await listUsers(portalType);
    } else if (shouldRevoke) {
      if (!email || !portalType) { console.error('Specify --email and --portal'); process.exit(1); }
      await revokeUser(email, portalType);
    } else {
      if (!email || !password || !portalType) {
        console.error('Usage: node scripts/admin-invite.js --email user@example.com --password temp123 --portal client|investor');
        process.exit(1);
      }
      await inviteUser(email, password, portalType);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
