/**
 * Local Supabase repository integration tests (Node).
 * Requires: supabase running + identities seeded.
 *
 * Usage: node scripts/repository-integration.mjs
 *
 * Payout coverage uses a per-run synthetic payable commission (service role)
 * so the suite is order-independent and re-runnable without manual reseed.
 * No real money movement: request_commission_payout only creates a local
 * payout_requests row and flips commission status.
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const PASSWORD = 'LocalTestVdb2026';
const DEMO_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DEMO_SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function loadEnv() {
  let apiUrl = 'http://127.0.0.1:54521';
  let anonKey = DEMO_ANON;
  let serviceKey = DEMO_SERVICE_ROLE;
  try {
    const out = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)="(.*)"$/);
      if (!m) continue;
      if (m[1] === 'API_URL') apiUrl = m[2];
      if (m[1] === 'ANON_KEY') anonKey = m[2];
      if (m[1] === 'SERVICE_ROLE_KEY') serviceKey = m[2];
    }
  } catch {
    // local demo defaults
  }
  return { apiUrl, anonKey, serviceKey };
}

function clientFor(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * LOCAL ONLY: ensure partner A has a dedicated payable commission for this run.
 * Mirrors the RLS suite's payout_test_commission pattern so repo-integration
 * does not depend on leftover seed balance after a prior payout request.
 */
async function ensurePartnerAPayableFixture(admin) {
  const flag = await admin
    .from('feature_flags')
    .update({ enabled: true })
    .eq('key', 'partner_payouts');
  if (flag.error) throw flag.error;

  const profile = await admin
    .from('app_profiles')
    .select('id')
    .eq('email', 'partner.active.a@local.vdb')
    .maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data?.id) {
    throw new Error('partner.active.a@local.vdb missing — run npm run db:seed:identities');
  }

  const partner = await admin
    .from('partner_profiles')
    .select('id')
    .eq('user_id', profile.data.id)
    .maybeSingle();
  if (partner.error) throw partner.error;
  if (!partner.data?.id) {
    throw new Error('partner profile for partner A missing — run npm run db:seed:identities');
  }
  const partnerId = partner.data.id;

  const accounts = await admin
    .from('payout_accounts')
    .select('id')
    .eq('partner_id', partnerId)
    .is('deleted_at', null)
    .limit(1);
  if (accounts.error) throw accounts.error;
  if (!accounts.data?.length) {
    const inserted = await admin.from('payout_accounts').insert({
      partner_id: partnerId,
      account_holder_name: 'Partner Active A',
      iban_encrypted: 'repo-int-encrypted-iban-partner-a',
      bic: 'ABNANL2A',
      country: 'NL',
      is_default: true,
    });
    if (inserted.error) throw inserted.error;
  }

  const sale = await admin
    .from('sales')
    .insert({
      partner_id: partnerId,
      status: 'won',
      currency: 'EUR',
      gross_amount_cents: 1815,
      net_amount_cents: 1500,
      metadata: { source: 'repository-integration', purpose: 'payout_double_spend_guard' },
    })
    .select('id')
    .single();
  if (sale.error) throw sale.error;

  const commission = await admin
    .from('commissions')
    .insert({
      sale_id: sale.data.id,
      partner_id: partnerId,
      status: 'payable',
      basis_amount_cents: 1500,
      rate_bps: 1000,
      commission_amount_cents: 150,
      currency: 'EUR',
      metadata: { source: 'repository-integration', purpose: 'payout_double_spend_guard' },
    })
    .select('id')
    .single();
  if (commission.error) throw commission.error;

  return {
    partnerId,
    saleId: sale.data.id,
    commissionId: commission.data.id,
  };
}

async function cleanupPartnerAPayableFixture(admin, fixture, payoutRequestId) {
  if (!fixture) return;
  if (payoutRequestId) {
    const delPayout = await admin.from('payout_requests').delete().eq('id', payoutRequestId);
    if (delPayout.error) console.warn('cleanup payout_requests:', delPayout.error.message);
  }
  // commission_events cascade from commissions; commissions cascade from sales.
  const delSale = await admin.from('sales').delete().eq('id', fixture.saleId);
  if (delSale.error) console.warn('cleanup sales:', delSale.error.message);
}

const results = [];

function pass(name) {
  results.push({ name, status: 'pass' });
  console.log(`PASS ${name}`);
}

function fail(name, err) {
  const detail =
    err?.message ||
    err?.code ||
    (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
  results.push({ name, status: 'fail', err: detail });
  console.error(`FAIL ${name}: ${detail}`);
}

async function asUser(url, anonKey, email) {
  const sb = clientFor(url, anonKey);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return { sb, user: data.user };
}

async function main() {
  const { apiUrl, anonKey, serviceKey } = loadEnv();
  const admin = clientFor(apiUrl, serviceKey);
  console.log(`API: ${apiUrl}`);

  // --- auth ---
  try {
    const { sb, user } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    if (!user?.id) throw new Error('missing user');
    const roles = await sb.from('user_roles').select('role').eq('user_id', user.id);
    if (roles.error) throw roles.error;
    if (!roles.data?.some((r) => r.role === 'customer')) throw new Error('expected customer role');
    pass('auth_customer_a_login_and_role');
    await sb.auth.signOut();
  } catch (e) {
    fail('auth_customer_a_login_and_role', e);
  }

  try {
    const sb = clientFor(apiUrl, anonKey);
    const { error } = await sb.auth.signInWithPassword({
      email: 'customer.a@local.vdb',
      password: 'WrongPassword!',
    });
    if (!error) throw new Error('expected auth failure');
    pass('auth_wrong_password_rejected');
  } catch (e) {
    fail('auth_wrong_password_rejected', e);
  }

  // --- projects ---
  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { data, error } = await sb.from('projects').select('id,title').limit(10);
    if (error) throw error;
    if (!data || data.length < 1) throw new Error('customer A should see at least one project');
    pass('projects_customer_a_list');
    await sb.auth.signOut();
  } catch (e) {
    fail('projects_customer_a_list', e);
  }

  try {
    const { sb: a } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { data: projects } = await a.from('projects').select('id').limit(1);
    const projectId = projects?.[0]?.id;
    await a.auth.signOut();
    if (!projectId) throw new Error('no project for A');

    const { sb: b } = await asUser(apiUrl, anonKey, 'customer.b@local.vdb');
    const { data, error } = await b.from('projects').select('id').eq('id', projectId).maybeSingle();
    if (error) throw error;
    if (data) throw new Error('customer B must not read project A');
    pass('projects_customer_b_cannot_read_a');
    await b.auth.signOut();
  } catch (e) {
    fail('projects_customer_b_cannot_read_a', e);
  }

  try {
    const { sb, user } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const title = `Integration request ${Date.now()}`;
    const { data, error } = await sb
      .from('projects')
      .insert({
        title,
        description: 'Created by repository-integration.mjs',
        status: 'request_received',
        customer_user_id: user.id,
      })
      .select('id,status')
      .single();
    if (error) throw error;
    if (data.status !== 'request_received') throw new Error('unexpected status');
    // Under staff-only UPDATE policy, PostgREST returns success with 0 rows (no error).
    const upd = await sb
      .from('projects')
      .update({ status: 'in_progress' })
      .eq('id', data.id)
      .select('id,status');
    if (upd.error) throw upd.error;
    if ((upd.data ?? []).length > 0) {
      throw new Error('customer must not update project status');
    }
    const check = await sb.from('projects').select('status').eq('id', data.id).single();
    if (check.error) throw check.error;
    if (check.data.status !== 'request_received') {
      throw new Error('project status must remain request_received');
    }
    pass('projects_customer_request_and_blocked_status_update');
    await sb.auth.signOut();
  } catch (e) {
    fail('projects_customer_request_and_blocked_status_update', e);
  }

  // --- messages ---
  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { data: convs, error } = await sb.from('conversations').select('id').limit(5);
    if (error) throw error;
    if (!convs?.length) throw new Error('expected seeded conversation for A');
    const conversationId = convs[0].id;
    const clientMessageId = `int-${Date.now()}`;
    const { data: userData } = await sb.auth.getUser();
    const { data: msg, error: msgErr } = await sb
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userData.user.id,
        body: 'Integration hello',
        client_message_id: clientMessageId,
      })
      .select('id')
      .single();
    if (msgErr) throw msgErr;
    const dup = await sb.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      body: 'Integration hello dup',
      client_message_id: clientMessageId,
    });
    if (!dup.error) throw new Error('expected unique client_message_id rejection');
    pass('messages_send_and_idempotency');
    void msg;
    await sb.auth.signOut();
  } catch (e) {
    fail('messages_send_and_idempotency', e);
  }

  try {
    const { sb: b } = await asUser(apiUrl, anonKey, 'customer.b@local.vdb');
    const { sb: a } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { data: convs } = await a.from('conversations').select('id').limit(1);
    await a.auth.signOut();
    const conversationId = convs?.[0]?.id;
    if (!conversationId) throw new Error('missing conversation');
    const { data, error } = await b
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId);
    if (error) throw error;
    if ((data ?? []).length > 0) throw new Error('B must not read A conversation messages');
    pass('messages_non_participant_blocked');
    await b.auth.signOut();
  } catch (e) {
    fail('messages_non_participant_blocked', e);
  }

  // --- support ---
  try {
    const { sb, user } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { data, error } = await sb
      .from('support_tickets')
      .insert({
        subject: `Integration ticket ${Date.now()}`,
        category: 'general',
        priority: 'normal',
        requester_id: user.id,
        status: 'open',
      })
      .select('id')
      .single();
    if (error) throw error;
    const msg = await sb.from('support_ticket_messages').insert({
      ticket_id: data.id,
      author_id: user.id,
      body: 'Integration test ticket body',
      is_internal: false,
    });
    if (msg.error) throw msg.error;
    const list = await sb.from('support_tickets').select('id').eq('id', data.id);
    if (list.error || !list.data?.length) throw new Error('cannot read own ticket');
    pass('support_create_and_list_own');
    await sb.auth.signOut();
  } catch (e) {
    fail('support_create_and_list_own', e);
  }

  // --- quotes / invoices / documents ---
  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const quotes = await sb.from('quotes').select('id,status').limit(5);
    if (quotes.error) throw quotes.error;
    pass('quotes_customer_a_list');
    await sb.auth.signOut();
  } catch (e) {
    fail('quotes_customer_a_list', e);
  }

  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const invoices = await sb.from('invoices').select('id').limit(5);
    if (invoices.error) throw invoices.error;
    pass('invoices_customer_a_list');
    await sb.auth.signOut();
  } catch (e) {
    fail('invoices_customer_a_list', e);
  }

  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const docs = await sb.from('documents').select('id,status').limit(5);
    if (docs.error) throw docs.error;
    pass('documents_customer_a_list');
    await sb.auth.signOut();
  } catch (e) {
    fail('documents_customer_a_list', e);
  }

  // --- partner commissions ---
  try {
    const { sb } = await asUser(apiUrl, anonKey, 'partner.active.a@local.vdb');
    const commissions = await sb.from('commissions').select('id,commission_amount_cents').limit(10);
    if (commissions.error) throw commissions.error;
    pass('commissions_partner_a_list');
    await sb.auth.signOut();
  } catch (e) {
    fail('commissions_partner_a_list', e);
  }

  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const commissions = await sb.from('commissions').select('id').limit(10);
    if (commissions.error) throw commissions.error;
    if ((commissions.data ?? []).length > 0) throw new Error('customer must not see commissions');
    pass('commissions_customer_blocked');
    await sb.auth.signOut();
  } catch (e) {
    fail('commissions_customer_blocked', e);
  }

  // --- account deletion request ---
  try {
    const { sb, user } = await asUser(apiUrl, anonKey, 'customer.b@local.vdb');
    const { data, error } = await sb
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        status: 'requested',
        reason: 'integration test',
      })
      .select('id,status')
      .single();
    if (error) throw error;
    if (data.status !== 'requested') throw new Error('unexpected deletion status');
    pass('account_deletion_request_insert');
    await sb.auth.signOut();
  } catch (e) {
    fail('account_deletion_request_insert', e);
  }

  // --- partner leads ---
  try {
    const { sb } = await asUser(apiUrl, anonKey, 'partner.active.a@local.vdb');
    const email = `lead-${Date.now()}@example.com`;
    const { data, error } = await sb.rpc('register_partner_lead', {
      p_name: 'Integration Lead',
      p_email: email,
      p_consent_given: true,
      p_campaign_code: 'integration-test',
    });
    if (error) throw error;
    if (!data?.id || data.status !== 'new') throw new Error('unexpected lead result');
    pass('partner_lead_register');
    await sb.auth.signOut();
  } catch (e) {
    fail('partner_lead_register', e);
  }

  // --- partner payout requests (local flag + synthetic payable fixture; no real payout) ---
  {
    let fixture = null;
    let payoutRequestId = null;
    try {
      fixture = await ensurePartnerAPayableFixture(admin);
      const { sb } = await asUser(apiUrl, anonKey, 'partner.active.a@local.vdb');

      const before = await sb
        .from('commissions')
        .select('id,status')
        .eq('id', fixture.commissionId)
        .maybeSingle();
      if (before.error) throw before.error;
      if (!before.data || before.data.status !== 'payable') {
        throw new Error('synthetic payable commission fixture missing for partner A');
      }

      const { data, error } = await sb.rpc('request_commission_payout', {
        p_commission_ids: [fixture.commissionId],
      });
      if (error) throw error;
      if (!data?.id || data.status !== 'submitted')
        throw new Error('unexpected payout_requests result');
      payoutRequestId = data.id;

      const after = await sb
        .from('commissions')
        .select('id,status')
        .eq('id', fixture.commissionId)
        .maybeSingle();
      if (after.error) throw after.error;
      if (after.data?.status !== 'payout_requested') {
        throw new Error('payable commission should have moved to payout_requested');
      }

      // Double-spend guard: same commission must not be requestable again.
      const second = await sb.rpc('request_commission_payout', {
        p_commission_ids: [fixture.commissionId],
      });
      if (!second.error) {
        throw new Error('expected second payout request to fail (commission no longer payable)');
      }
      pass('partner_payout_request_and_double_spend_guard');
      await sb.auth.signOut();
    } catch (e) {
      fail('partner_payout_request_and_double_spend_guard', e);
    } finally {
      await cleanupPartnerAPayableFixture(admin, fixture, payoutRequestId);
    }
  }

  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { error } = await sb.rpc('request_commission_payout', {});
    if (!error) throw new Error('customer must not be able to request a partner payout');
    pass('customer_cannot_request_payout');
    await sb.auth.signOut();
  } catch (e) {
    fail('customer_cannot_request_payout', e);
  }

  // --- admin support ticket replies ---
  try {
    const { sb: staffSb } = await asUser(apiUrl, anonKey, 'staff@local.vdb');
    const { sb: customerSb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { data: tickets, error: ticketErr } = await customerSb
      .from('support_tickets')
      .select('id')
      .limit(1);
    if (ticketErr) throw ticketErr;
    const ticketId = tickets?.[0]?.id;
    if (!ticketId) throw new Error('expected a seeded support ticket for customer A');
    await customerSb.auth.signOut();

    const clientMessageId = `int-reply-${Date.now()}`;
    const { data: reply, error: replyErr } = await staffSb.rpc('admin_reply_support_ticket', {
      p_ticket_id: ticketId,
      p_body: 'Integration reply from staff',
      p_is_internal: false,
      p_client_message_id: clientMessageId,
    });
    if (replyErr) throw replyErr;
    if (!reply?.id) throw new Error('unexpected admin_reply_support_ticket result');

    const dup = await staffSb.rpc('admin_reply_support_ticket', {
      p_ticket_id: ticketId,
      p_body: 'Integration reply from staff',
      p_is_internal: false,
      p_client_message_id: clientMessageId,
    });
    if (dup.error) throw dup.error;
    if (dup.data.id !== reply.id)
      throw new Error('expected idempotent replay on client_message_id');

    const { data: ticketAfter, error: afterErr } = await staffSb
      .from('support_tickets')
      .select('status')
      .eq('id', ticketId)
      .single();
    if (afterErr) throw afterErr;
    if (ticketAfter.status !== 'waiting_on_customer') {
      throw new Error(`expected ticket to flip to waiting_on_customer, got ${ticketAfter.status}`);
    }
    pass('admin_reply_support_ticket_and_idempotency');
    await staffSb.auth.signOut();
  } catch (e) {
    fail('admin_reply_support_ticket_and_idempotency', e);
  }

  try {
    const { sb } = await asUser(apiUrl, anonKey, 'customer.a@local.vdb');
    const { data: tickets } = await sb.from('support_tickets').select('id').limit(1);
    const ticketId = tickets?.[0]?.id;
    if (!ticketId) throw new Error('expected a seeded support ticket for customer A');
    const { error } = await sb.rpc('admin_reply_support_ticket', {
      p_ticket_id: ticketId,
      p_body: 'Customer should not be able to reply as staff',
      p_is_internal: false,
    });
    if (!error) throw new Error('customer must not be able to call admin_reply_support_ticket');
    pass('customer_cannot_admin_reply');
    await sb.auth.signOut();
  } catch (e) {
    fail('customer_cannot_admin_reply', e);
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  console.log(
    `\nREPO_INTEGRATION_SUMMARY tests=${results.length} passed=${passed} failed=${failed} skipped=0`,
  );
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
