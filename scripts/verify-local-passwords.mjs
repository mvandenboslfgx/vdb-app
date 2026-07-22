import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const out = execSync('npx supabase status -o env', { encoding: 'utf8' });
let apiUrl = 'http://127.0.0.1:54521';
let serviceKey = '';
let anonKey = '';
for (const line of out.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="(.*)"$/);
  if (!m) continue;
  if (m[1] === 'API_URL') apiUrl = m[2];
  if (m[1] === 'SERVICE_ROLE_KEY') serviceKey = m[2];
  if (m[1] === 'ANON_KEY') anonKey = m[2];
}

const PASSWORD = 'LocalTestVdb2026';
const admin = createClient(apiUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
if (error) throw error;

const emails = [
  'customer.a@local.vdb',
  'partner.active.a@local.vdb',
  'admin@local.vdb',
];

for (const email of emails) {
  const u = data.users.find((x) => x.email?.toLowerCase() === email);
  if (!u) {
    console.log('MISSING', email);
    continue;
  }
  const upd = await admin.auth.admin.updateUserById(u.id, {
    password: PASSWORD,
    email_confirm: true,
  });
  console.log('update', email, upd.error?.message || 'ok');
}

const anon = createClient(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
for (const email of emails) {
  const sign = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  console.log('signin', email, sign.error?.message || 'ok');
}
