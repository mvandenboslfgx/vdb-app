/**
 * Fail-closed guard for Mobile local database type generation.
 * Canonical target: 127.0.0.1:54522 / project_id vdb-digital-mobile-local.
 * Never logs passwords, full connection strings, tokens, or row data.
 */

'use strict';

const { readFileSync, existsSync, statSync } = require('node:fs');
const { resolve } = require('node:path');

const MOBILE_LOCAL_PROJECT_ID = 'vdb-digital-mobile-local';
const MOBILE_LOCAL_DB_PORT = 54522;
const MOBILE_LOCAL_API_PORT = 54521;

const DENIED_DB_PORTS = Object.freeze([5432, 54322, 54422]);
const DENIED_PROJECT_REFS = Object.freeze([
  'qzekuvmgfekzsowdecyk', // staging
  'nhsrdnjfsxfikfbdmdfj', // production
]);

/** Structural minimum for a full Mobile Database types file (rejects ~3KB stubs). */
const MIN_TYPES_BYTES = 40_000;
const REQUIRED_TYPE_MARKERS = Object.freeze([
  'export type Database',
  'support_tickets',
  'support_ticket_messages',
  'invoices',
  'quotes',
  'quote_items',
  'commissions',
  'partner_profiles',
  'partner_applications',
  'projects',
  'appointments',
  'documents',
  'conversations',
  'messages',
]);

class LocalDbTargetError extends Error {
  constructor(message, code = 'LOCAL_DB_TARGET_DENIED') {
    super(message);
    this.name = 'LocalDbTargetError';
    this.code = code;
  }
}

function parsePostgresTarget(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  for (const ref of DENIED_PROJECT_REFS) {
    if (trimmed.includes(ref)) {
      throw new LocalDbTargetError(
        `Denied project ref in database target (${ref.slice(0, 6)}…)`,
        'DENIED_PROJECT_REF',
      );
    }
  }
  if (/supabase\.co/i.test(trimmed) || /aws\.com/i.test(trimmed)) {
    throw new LocalDbTargetError(
      'Remote hostname is not allowed for type generation',
      'DENIED_REMOTE_HOST',
    );
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!/^postgres(ql)?:$/i.test(url.protocol)) {
    throw new LocalDbTargetError(
      `Unsupported database protocol: ${url.protocol}`,
      'DENIED_PROTOCOL',
    );
  }

  const host = (url.hostname || '').toLowerCase();
  const port = url.port ? Number(url.port) : 5432;
  const database = (url.pathname || '/').replace(/^\//, '') || 'postgres';

  return { host, port, database };
}

function assertMobileLocalDbTarget(target) {
  if (!target || target.host == null || target.port == null) {
    throw new LocalDbTargetError('Database target is missing', 'MISSING_TARGET');
  }

  const host = String(target.host).toLowerCase();
  const port = Number(target.port);
  const projectId = target.projectId ? String(target.projectId) : undefined;

  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new LocalDbTargetError(
      `Host must be 127.0.0.1 or localhost (got hostclass=${classifyHost(host)})`,
      'DENIED_HOST',
    );
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new LocalDbTargetError('Database port is missing or invalid', 'MISSING_PORT');
  }

  if (DENIED_DB_PORTS.includes(port)) {
    throw new LocalDbTargetError(
      `Database port ${port} is denied (Mobile local requires ${MOBILE_LOCAL_DB_PORT})`,
      'DENIED_PORT',
    );
  }

  if (port !== MOBILE_LOCAL_DB_PORT) {
    throw new LocalDbTargetError(
      `Database port must be ${MOBILE_LOCAL_DB_PORT} (got ${port})`,
      'DENIED_PORT',
    );
  }

  if (projectId && projectId !== MOBILE_LOCAL_PROJECT_ID) {
    throw new LocalDbTargetError(
      `Local project_id must be ${MOBILE_LOCAL_PROJECT_ID}`,
      'DENIED_PROJECT_ID',
    );
  }

  return {
    hostclass: host === '127.0.0.1' ? 'loopback-ipv4' : 'localhost',
    port,
    projectId: projectId ?? MOBILE_LOCAL_PROJECT_ID,
  };
}

function classifyHost(host) {
  const h = String(host || '').toLowerCase();
  if (h === '127.0.0.1') return 'loopback-ipv4';
  if (h === 'localhost') return 'localhost';
  if (h === '::1') return 'loopback-ipv6';
  if (!h) return 'missing';
  if (h.includes('supabase.co')) return 'supabase-remote';
  return 'remote-or-unknown';
}

function readMobileSupabaseConfig(repoRoot) {
  const configPath = resolve(repoRoot, 'supabase', 'config.toml');
  if (!existsSync(configPath)) {
    throw new LocalDbTargetError('Missing supabase/config.toml', 'MISSING_CONFIG');
  }
  const text = readFileSync(configPath, 'utf8');
  const projectId = text.match(/^\s*project_id\s*=\s*"([^"]+)"/m)?.[1];
  const dbSection = text.split(/^\[db\]/m)[1]?.split(/^\[/m)[0] ?? '';
  const portRaw = dbSection.match(/^\s*port\s*=\s*(\d+)/m)?.[1];
  const port = portRaw ? Number(portRaw) : undefined;

  if (!projectId) {
    throw new LocalDbTargetError('supabase/config.toml missing project_id', 'MISSING_PROJECT_ID');
  }
  if (port == null) {
    throw new LocalDbTargetError('supabase/config.toml missing [db].port', 'MISSING_PORT');
  }

  assertMobileLocalDbTarget({ host: '127.0.0.1', port, projectId });

  return { projectId, port, configPath };
}

function parseDbUrlFromStatusEnv(envOutput) {
  if (!envOutput || typeof envOutput !== 'string') {
    throw new LocalDbTargetError('supabase status output missing', 'MISSING_STATUS');
  }
  const line =
    envOutput.match(/^(?:export\s+)?DB_URL=(.+)$/m)?.[1] ??
    envOutput.match(/"DB_URL"\s*:\s*"([^"]+)"/)?.[1];
  if (!line) {
    throw new LocalDbTargetError('DB_URL missing from supabase status', 'MISSING_DB_URL');
  }
  const unquoted = line.replace(/^["']|["']$/g, '').trim();
  const parsed = parsePostgresTarget(unquoted);
  if (!parsed) {
    throw new LocalDbTargetError('DB_URL could not be parsed', 'INVALID_DB_URL');
  }
  return parsed;
}

function formatSafeTargetEvidence(meta) {
  return {
    hostclass: meta.hostclass,
    port: meta.port,
    localProjectId: meta.projectId,
    tableCount: meta.tableCount ?? null,
    migrationTip: meta.migrationTip ?? null,
  };
}

function assertPlausibleMobileTypesOutput(typesText, opts = {}) {
  if (!typesText || typeof typesText !== 'string') {
    throw new LocalDbTargetError('Generated types output is empty', 'TYPES_EMPTY');
  }

  const bytes = Buffer.byteLength(typesText, 'utf8');
  if (opts.path && existsSync(opts.path)) {
    const size = statSync(opts.path).size;
    if (size < MIN_TYPES_BYTES) {
      throw new LocalDbTargetError(
        `Types file too small (${size} bytes) — refusing stub output`,
        'TYPES_STUB_REJECTED',
      );
    }
  }

  if (bytes < MIN_TYPES_BYTES) {
    throw new LocalDbTargetError(
      `Generated types too small (${bytes} bytes) — refusing stub output`,
      'TYPES_STUB_REJECTED',
    );
  }

  const missing = REQUIRED_TYPE_MARKERS.filter((m) => !typesText.includes(m));
  if (missing.length > 0) {
    throw new LocalDbTargetError(
      `Generated types missing required markers: ${missing.join(', ')}`,
      'TYPES_INCOMPLETE',
    );
  }

  if (/postgresql:\/\/[^:\s]+:[^@\s]+@/i.test(typesText) || /service_role/i.test(typesText)) {
    throw new LocalDbTargetError('Generated types appear to contain secrets', 'TYPES_SECRET_LEAK');
  }

  return { bytes, markers: REQUIRED_TYPE_MARKERS.length };
}

function redactSecrets(text) {
  if (!text) return text;
  return String(text)
    .replace(/postgresql:\/\/[^@\s]+@/gi, 'postgresql://***@')
    .replace(/(password|secret|token|service_role)[=:]\s*\S+/gi, '$1=***')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt-redacted]');
}

module.exports = {
  MOBILE_LOCAL_PROJECT_ID,
  MOBILE_LOCAL_DB_PORT,
  MOBILE_LOCAL_API_PORT,
  DENIED_DB_PORTS,
  DENIED_PROJECT_REFS,
  MIN_TYPES_BYTES,
  REQUIRED_TYPE_MARKERS,
  LocalDbTargetError,
  parsePostgresTarget,
  assertMobileLocalDbTarget,
  classifyHost,
  readMobileSupabaseConfig,
  parseDbUrlFromStatusEnv,
  formatSafeTargetEvidence,
  assertPlausibleMobileTypesOutput,
  redactSecrets,
};
