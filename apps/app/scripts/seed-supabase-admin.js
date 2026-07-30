const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const appSlug = 'momentry';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^[\"']|[\"']$/g, '');
    if (process.env[key] == null) process.env[key] = value;
  }
}

const credentialsDir = process.env.UULAB_CREDENTIALS_DIR || '/Users/bonjin/Documents/workspace/uulab/.credentials';
loadEnvFile(path.join(credentialsDir, 'supabase', `${appSlug}.admin.env`));
loadEnvFile('.env.admin.local');
loadEnvFile('.env.local');

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.UULAB_ADMIN_EMAIL;
const password = process.env.UULAB_ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  console.error('Missing Supabase admin seed URL, service key, email, or password.');
  console.error(`Create ${path.join(credentialsDir, 'supabase', `${appSlug}.admin.env`)} or .env.admin.local.`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findExistingUser() {
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  const existing = await findExistingUser();
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        role: 'admin',
        name: '관리자',
      },
      app_metadata: {
        ...(existing.app_metadata || {}),
        role: 'admin',
      },
    });
    if (error) throw error;
    console.log(`Updated Supabase admin user: ${email}`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      name: '관리자',
    },
    app_metadata: {
      role: 'admin',
    },
  });
  if (error) throw error;
  console.log(`Created Supabase admin user: ${email}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
