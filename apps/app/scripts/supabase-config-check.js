const { dependencies = {} } = require('../package.json');

if (!dependencies['@supabase/supabase-js']) {
  console.log('Supabase config check skipped: this local-first app does not use Supabase.');
  process.exit(0);
}

const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing Supabase env: ${missing.join(', ')}`);
  console.error('Set them in .env.local or the EAS environment before build/update.');
  process.exit(1);
}

try {
  const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
  if (!url.hostname.endsWith('.supabase.co')) {
    console.warn(`Supabase URL host is not *.supabase.co: ${url.hostname}`);
  }
} catch {
  console.error('EXPO_PUBLIC_SUPABASE_URL is not a valid URL.');
  process.exit(1);
}

console.log('Supabase config check passed.');
