/**
 * Idempotent local identity seed for VDB Digital mobile.
 * LOCAL ONLY — never run against production.
 *
 * Usage: node scripts/seed-local-identities.mjs
 * After: npx supabase db reset
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const LOCAL_PASSWORD = 'LocalTestVdb2026';
const DEMO_SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const DEMO_URL = 'http://127.0.0.1:54521';

function loadLocalEnv() {
  let apiUrl = process.env.SUPABASE_URL || process.env.API_URL || DEMO_URL;
  let serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
  try {
    const out = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)="(.*)"$/);
      if (!m) continue;
      if (m[1] === 'API_URL') apiUrl = m[2];
      if (m[1] === 'SERVICE_ROLE_KEY') serviceKey = m[2];
    }
  } catch {
    // fall back to demo key
  }
  if (!serviceKey) serviceKey = DEMO_SERVICE_ROLE;
  return { apiUrl, serviceKey };
}

const IDENTITIES = [
  { email: 'customer.a@local.vdb', role: 'customer', full_name: 'Customer A' },
  { email: 'customer.b@local.vdb', role: 'customer', full_name: 'Customer B' },
  {
    email: 'partner.pending@local.vdb',
    role: 'partner_pending',
    full_name: 'Partner Pending',
  },
  {
    email: 'partner.active.a@local.vdb',
    role: 'partner',
    full_name: 'Partner Active A',
  },
  {
    email: 'partner.active.b@local.vdb',
    role: 'partner',
    full_name: 'Partner Active B',
  },
  {
    email: 'partner.suspended@local.vdb',
    role: 'partner',
    full_name: 'Partner Suspended',
    suspended: true,
  },
  { email: 'staff@local.vdb', role: 'staff', full_name: 'Staff User' },
  { email: 'admin@local.vdb', role: 'admin', full_name: 'Admin User' },
  { email: 'owner@local.vdb', role: 'owner', full_name: 'Owner User' },
];

async function findUserByEmail(admin, email) {
  // listUsers pagination is enough for local
  let page = 1;
  for (;;) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function upsertUser(admin, identity) {
  const existing = await findUserByEmail(admin, identity.email);
  if (existing) {
    const { error } = await admin.updateUserById(existing.id, {
      password: LOCAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: identity.full_name, locale: 'nl' },
    });
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await admin.createUser({
    email: identity.email,
    password: LOCAL_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: identity.full_name, locale: 'nl' },
  });
  if (error) throw error;
  return data.user.id;
}

async function setRole(db, userId, role) {
  // Ensure customer always present; then elevated role if different
  await db.from('user_roles').upsert(
    { user_id: userId, role: 'customer', notes: 'seed' },
    { onConflict: 'user_id,role' }
  );
  if (role !== 'customer') {
    await db.from('user_roles').upsert(
      { user_id: userId, role, notes: 'seed' },
      { onConflict: 'user_id,role' }
    );
  }
}

async function wipeSeedDomain(db, ids) {
  const idList = Object.values(ids);
  const tables = [
    'message_receipts','messages','conversation_participants','conversations',
    'support_ticket_messages','support_tickets',
    'document_reviews','document_versions','documents',
    'quote_acceptances','quote_items','quotes',
    'invoice_items','payment_events','invoices',
    'project_activity','project_updates','project_milestones','project_members','projects',
    'commission_events','commissions','sale_attributions','sales',
    'partner_links','partner_codes',
    'partner_lead_staff_notes','partner_leads',
  ];
  for (const table of tables) {
    const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.warn(`wipe ${table}:`, error.message);
  }
  {
    const { error } = await db.from('partner_profiles').delete().in('user_id', idList);
    if (error) console.warn('wipe partner_profiles:', error.message);
  }
  {
    const { error } = await db.from('partner_applications').delete().in('user_id', idList);
    if (error) console.warn('wipe partner_applications:', error.message);
  }
}

async function main() {
  const { apiUrl, serviceKey } = loadLocalEnv();
  console.log(`Seeding local identities at ${apiUrl}`);

  const adminClient = createClient(apiUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const admin = adminClient.auth.admin;
  const db = adminClient;

  const ids = {};
  for (const identity of IDENTITIES) {
    const id = await upsertUser(admin, identity);
    ids[identity.email] = id;
    await db.from('app_profiles').upsert({
      id,
      email: identity.email,
      full_name: identity.full_name,
      locale: 'nl',
    });
    await setRole(db, id, identity.role);
    console.log(`  user ${identity.email} -> ${id} (${identity.role})`);
  }

  await wipeSeedDomain(db, ids);

  // LOCAL ONLY: enable partner payouts so payout RPC + UI can be exercised
  // in local testing. Never enable this in a remote/production seed.
  {
    const { error } = await db
      .from('feature_flags')
      .update({ enabled: true })
      .eq('key', 'partner.payouts');
    if (error) console.warn('enable partner.payouts flag:', error.message);
  }

  const customerA = ids['customer.a@local.vdb'];
  const customerB = ids['customer.b@local.vdb'];
  const staff = ids['staff@local.vdb'];
  const partnerA = ids['partner.active.a@local.vdb'];
  const partnerB = ids['partner.active.b@local.vdb'];
  const partnerSusp = ids['partner.suspended@local.vdb'];
  const partnerPend = ids['partner.pending@local.vdb'];

  // Partner applications + profiles
  const { data: appA } = await db
    .from('partner_applications')
    .insert({
      user_id: partnerA,
      full_name: 'Partner Active A',
      email: 'partner.active.a@local.vdb',
      company_name: 'Partner A Co',
      status: 'approved',
      accepted_partner_rules: true,
      accepted_privacy_policy: true,
      reviewed_by: staff,
      reviewed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const { data: appB } = await db
    .from('partner_applications')
    .insert({
      user_id: partnerB,
      full_name: 'Partner Active B',
      email: 'partner.active.b@local.vdb',
      company_name: 'Partner B Co',
      status: 'approved',
      accepted_partner_rules: true,
      accepted_privacy_policy: true,
      reviewed_by: staff,
      reviewed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  await db.from('partner_applications').insert({
    user_id: partnerPend,
    full_name: 'Partner Pending',
    email: 'partner.pending@local.vdb',
    status: 'submitted',
    accepted_partner_rules: true,
    accepted_privacy_policy: true,
  });

  await db.from('partner_applications').insert({
    user_id: partnerSusp,
    full_name: 'Partner Suspended',
    email: 'partner.suspended@local.vdb',
    status: 'suspended',
    accepted_partner_rules: true,
    accepted_privacy_policy: true,
    reviewed_by: staff,
  });

  const { data: ppA } = await db
    .from('partner_profiles')
    .insert({
      user_id: partnerA,
      application_id: appA?.id,
      display_name: 'Partner Active A',
      company_name: 'Partner A Co',
      is_active: true,
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  const { data: ppB } = await db
    .from('partner_profiles')
    .insert({
      user_id: partnerB,
      application_id: appB?.id,
      display_name: 'Partner Active B',
      company_name: 'Partner B Co',
      is_active: true,
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  await db.from('partner_profiles').insert({
    user_id: partnerSusp,
    display_name: 'Partner Suspended',
    is_active: false,
  });

  if (ppA?.id) {
    await db.from('partner_codes').insert({
      partner_id: ppA.id,
      code: 'PARTNERA',
      is_active: true,
      campaign: 'local-seed',
    });
  }

  // Project for customer A
  const { data: project, error: projErr } = await db
    .from('projects')
    .insert({
      title: 'Local Seed Project A',
      description: 'Seeded project for customer A',
      status: 'intake',
      customer_user_id: customerA,
      owner_staff_id: staff,
    })
    .select('id')
    .single();
  if (projErr) throw projErr;

  await db.from('project_members').insert([
    { project_id: project.id, user_id: customerA, role: 'customer' },
    { project_id: project.id, user_id: staff, role: 'staff' },
  ]);

  await db.from('project_updates').insert({
    project_id: project.id,
    author_id: staff,
    title: 'Welcome',
    body: 'Project kicked off (seed)',
    is_customer_visible: true,
  });

  // Conversation A + staff
  const { data: convo } = await db
    .from('conversations')
    .insert({
      conversation_type: 'customer_support',
      project_id: project.id,
      subject: 'Seed chat A+staff',
      created_by: customerA,
    })
    .select('id')
    .single();

  await db.from('conversation_participants').insert([
    { conversation_id: convo.id, user_id: customerA, role: 'member' },
    { conversation_id: convo.id, user_id: staff, role: 'staff' },
  ]);

  const { data: msg } = await db
    .from('messages')
    .insert({
      conversation_id: convo.id,
      sender_id: customerA,
      body: 'Hello from customer A (seed)',
    })
    .select('id')
    .single();

  await db.from('message_receipts').insert({
    message_id: msg.id,
    user_id: staff,
    delivered_at: new Date().toISOString(),
  });

  // Support ticket for A
  const { data: ticket } = await db
    .from('support_tickets')
    .insert({
      requester_id: customerA,
      project_id: project.id,
      conversation_id: convo.id,
      subject: 'Seed support ticket',
      category: 'general',
      status: 'open',
      priority: 'normal',
      assigned_to: staff,
    })
    .select('id')
    .single();

  await db.from('support_ticket_messages').insert([
    {
      ticket_id: ticket.id,
      author_id: customerA,
      body: 'Customer question (seed)',
      is_internal: false,
    },
    {
      ticket_id: ticket.id,
      author_id: staff,
      body: 'Internal note (seed)',
      is_internal: true,
    },
  ]);

  // Quote for A
  const { data: quote } = await db
    .from('quotes')
    .insert({
      quote_number: 'Q-LOCAL-SEED-A',
      customer_user_id: customerA,
      project_id: project.id,
      status: 'sent',
      currency: 'EUR',
      subtotal_cents: 10000,
      tax_cents: 2100,
      total_cents: 12100,
      created_by: staff,
      sent_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
    .select('id')
    .single();

  await db.from('quote_items').insert({
    quote_id: quote.id,
    description: 'Seed line item',
    quantity: 1,
    unit_amount_cents: 10000,
    tax_rate_bps: 2100,
  });

  // Invoice for A + B (isolation tests)
  await db.from('invoices').insert([
    {
      invoice_number: 'INV-LOCAL-SEED-A',
      customer_user_id: customerA,
      project_id: project.id,
      quote_id: quote.id,
      status: 'issued',
      currency: 'EUR',
      subtotal_cents: 10000,
      tax_cents: 2100,
      total_cents: 12100,
      issued_on: new Date().toISOString().slice(0, 10),
      due_on: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
    {
      invoice_number: 'INV-LOCAL-SEED-B',
      customer_user_id: customerB,
      status: 'issued',
      currency: 'EUR',
      subtotal_cents: 5000,
      tax_cents: 1050,
      total_cents: 6050,
      issued_on: new Date().toISOString().slice(0, 10),
      due_on: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    },
  ]);

  // Documents (clean + flagged)
  const { data: doc } = await db
    .from('documents')
    .insert({
      project_id: project.id,
      owner_user_id: customerA,
      title: 'Seed document',
      category: 'contract',
      status: 'available',
    })
    .select('id')
    .single();

  await db.from('document_versions').insert([
    {
      document_id: doc.id,
      version_number: 1,
      storage_path: 'seed/doc-v1.pdf',
      mime_type: 'application/pdf',
      byte_size: 1024,
      uploaded_by: staff,
      scan_status: 'clean',
      status: 'available',
    },
    {
      document_id: doc.id,
      version_number: 2,
      storage_path: 'seed/doc-v2-flagged.pdf',
      mime_type: 'application/pdf',
      byte_size: 2048,
      uploaded_by: staff,
      scan_status: 'flagged',
      status: 'uploaded',
    },
  ]);

  // Sale + commissions for partner A (partner cannot update).
  // Three commissions covering the flows under test:
  //  - pending: not yet actionable by anyone
  //  - under_review: admin finance approve/reject flow (Goal E)
  //  - payable: partner payout request flow (Goal C)
  if (ppA?.id) {
    await db.from('payout_accounts').insert({
      partner_id: ppA.id,
      account_holder_name: 'Partner Active A',
      iban_encrypted: 'seed-encrypted-iban-partner-a',
      bic: 'ABNANL2A',
      country: 'NL',
      is_default: true,
    });

    const { data: sale } = await db
      .from('sales')
      .insert({
        customer_user_id: customerA,
        partner_id: ppA.id,
        status: 'won',
        currency: 'EUR',
        gross_amount_cents: 12100,
        net_amount_cents: 10000,
      })
      .select('id')
      .single();

    await db.from('commissions').insert([
      {
        sale_id: sale.id,
        partner_id: ppA.id,
        status: 'pending',
        basis_amount_cents: 10000,
        rate_bps: 1000,
        commission_amount_cents: 1000,
        currency: 'EUR',
      },
      {
        sale_id: sale.id,
        partner_id: ppA.id,
        status: 'under_review',
        basis_amount_cents: 20000,
        rate_bps: 1000,
        commission_amount_cents: 2000,
        currency: 'EUR',
      },
      {
        sale_id: sale.id,
        partner_id: ppA.id,
        status: 'payable',
        basis_amount_cents: 30000,
        rate_bps: 1000,
        commission_amount_cents: 3000,
        currency: 'EUR',
      },
    ]);
  }

  // Partner leads (isolation + staff-notes tests)
  let leadA;
  if (ppA?.id) {
    const { data } = await db
      .from('partner_leads')
      .insert({
        partner_id: ppA.id,
        campaign_code: 'local-seed',
        name: 'Lead For Partner A',
        email: 'lead.a@example.com',
        phone: '+31600000001',
        interest: 'kitchen renovation',
        notes: 'Seed lead (partner A)',
        consent_given: true,
        consent_at: new Date().toISOString(),
        status: 'new',
        created_by: partnerA,
      })
      .select('id')
      .single();
    leadA = data;
    if (leadA?.id) {
      await db.from('partner_lead_staff_notes').insert({
        lead_id: leadA.id,
        note: 'Internal staff note (seed) - partner must never see this',
        created_by: staff,
      });
    }
  }

  if (ppB?.id) {
    await db.from('partner_leads').insert({
      partner_id: ppB.id,
      campaign_code: 'local-seed',
      name: 'Lead For Partner B',
      email: 'lead.b@example.com',
      consent_given: true,
      consent_at: new Date().toISOString(),
      status: 'new',
      created_by: partnerB,
    });
  }

  console.log('Seed complete.');
  console.log(JSON.stringify({ projectId: project.id, conversationId: convo.id, quoteId: quote.id }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
