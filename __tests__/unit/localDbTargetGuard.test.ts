const {
  DENIED_DB_PORTS,
  LocalDbTargetError,
  MOBILE_LOCAL_DB_PORT,
  assertMobileLocalDbTarget,
  assertPlausibleMobileTypesOutput,
  parsePostgresTarget,
  redactSecrets,
} = require('../../scripts/lib/local-db-target-guard.cjs');

describe('Mobile local DB target guard', () => {
  it('allows port 54522 on loopback', () => {
    const safe = assertMobileLocalDbTarget({
      host: '127.0.0.1',
      port: MOBILE_LOCAL_DB_PORT,
      projectId: 'vdb-digital-mobile-local',
    });
    expect(safe.port).toBe(54522);
    expect(safe.hostclass).toBe('loopback-ipv4');
  });

  it('allows localhost host alias with port 54522', () => {
    const safe = assertMobileLocalDbTarget({ host: 'localhost', port: 54522 });
    expect(safe.hostclass).toBe('localhost');
  });

  it('rejects port 5432', () => {
    expect(() => assertMobileLocalDbTarget({ host: '127.0.0.1', port: 5432 })).toThrow(
      /denied|must be 54522/i,
    );
    expect(DENIED_DB_PORTS).toContain(5432);
  });

  it('rejects port 54322 (Owner sibling)', () => {
    expect(() => assertMobileLocalDbTarget({ host: '127.0.0.1', port: 54322 })).toThrow(
      LocalDbTargetError,
    );
  });

  it('rejects port 54422 (Partners sibling)', () => {
    expect(() => assertMobileLocalDbTarget({ host: '127.0.0.1', port: 54422 })).toThrow(
      LocalDbTargetError,
    );
  });

  it('rejects remote hostname', () => {
    expect(() => assertMobileLocalDbTarget({ host: 'db.example.com', port: 54522 })).toThrow(
      /Host must be/,
    );
  });

  it('rejects staging project ref inside URL parse', () => {
    expect(() =>
      parsePostgresTarget(
        'postgresql://postgres:x@db.kjricvicakvsreuytvra.supabase.co:5432/postgres',
      ),
    ).toThrow(/Denied project ref|Remote hostname/);
    expect(() =>
      parsePostgresTarget(
        'postgresql://postgres:x@db.qzekuvmgfekzsowdecyk.supabase.co:5432/postgres',
      ),
    ).toThrow(/Denied project ref|Remote hostname/);
  });

  it('rejects production project ref inside URL parse', () => {
    expect(() =>
      parsePostgresTarget(
        'postgresql://postgres:x@db.nhsrdnjfsxfikfbdmdfj.supabase.co:5432/postgres',
      ),
    ).toThrow(/Denied project ref|Remote hostname/);
  });

  it('rejects missing target', () => {
    expect(() => assertMobileLocalDbTarget(null)).toThrow(/missing/i);
    expect(() => assertMobileLocalDbTarget({})).toThrow(/missing/i);
  });

  it('rejects tiny stub type output', () => {
    const stub = 'export type Database = { public: { Tables: {} } }\n';
    expect(() => assertPlausibleMobileTypesOutput(stub)).toThrow(/too small|stub/i);
  });

  it('accepts structurally complete Mobile types output', () => {
    const body = [
      'export type Json = string',
      'export type Database = {',
      '  public: {',
      '    Tables: {',
      '      support_tickets: { Row: { id: string } }',
      '      support_ticket_messages: { Row: { id: string } }',
      '      invoices: { Row: { amount_cents: number } }',
      '      quotes: { Row: { id: string } }',
      '      quote_items: { Row: { id: string } }',
      '      commissions: { Row: { id: string } }',
      '      partner_profiles: { Row: { status: string } }',
      '      partner_applications: { Row: { id: string } }',
      '      projects: { Row: { id: string } }',
      '      appointments: { Row: { id: string } }',
      '      documents: { Row: { id: string } }',
      '      conversations: { Row: { id: string } }',
      '      messages: { Row: { id: string } }',
      '    }',
      '  }',
      '}',
    ].join('\n');
    const padded = body + '\n' + 'x'.repeat(40_000);
    expect(() => assertPlausibleMobileTypesOutput(padded)).not.toThrow();
  });

  it('does not echo secrets when redacting log text', () => {
    const raw =
      'fail postgresql://postgres:super-secret-password@127.0.0.1:54522/postgres token=abc SERVICE_ROLE=xyz';
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain('super-secret-password');
    expect(redacted).not.toMatch(/postgres:[^@]+@/);
    expect(redacted).toContain('postgresql://***@');
  });

  it('two normalized generations compare equal when body identical', () => {
    const a = 'export type Database = { public: {} }\n';
    const b = 'export type Database = { public: {} }\r\n';
    const norm = (s: string) => s.replace(/\r\n/g, '\n').trim();
    expect(norm(a)).toBe(norm(b));
  });
});
