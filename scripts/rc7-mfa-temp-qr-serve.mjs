#!/usr/bin/env node
/**
 * Write MFA QR to user temp dir and serve on 127.0.0.1 only. Secrets never logged.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { parseEnvFile } from './lib/load-env-file.mjs';

const VAULT_DIR = process.env.RC7_VAULT_DIR || 'C:/Users/XXX/.vdb-vault';
const MFA_VAULT = path.join(VAULT_DIR, 'rc7-staging-mfa-operator.env');
const OUT_DIR = path.join(os.homedir(), 'AppData', 'Local', 'Temp', 'vdb-rc7-mfa');
const HTML = path.join(OUT_DIR, 'scan.html');
const HOST = '127.0.0.1';
const PORT = Number(process.env.RC7_MFA_SERVE_PORT || 8765);

function buildOtpAuth(email, secret) {
  const label = encodeURIComponent(`Supabase:${email}`);
  const issuer = encodeURIComponent('Supabase');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

function writeScanHtml(factorPrefix, otpauth) {
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>RC7 MFA scan (temp local)</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px; margin: 2rem auto; padding: 1rem; }
    .box { border: 1px solid #ccc; border-radius: 12px; padding: 1rem; }
    canvas { display: block; margin: 1rem auto; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
</head>
<body>
  <h1>RC7 staging TOTP</h1>
  <div class="box">
    <p><strong>Account:</strong> staff.aal2.rc7-staging@example.com</p>
    <p><strong>Staging ref:</strong> kjricvicakvsreuytvra</p>
    <p><strong>Verified factor prefix:</strong> ${factorPrefix}</p>
    <canvas id="q"></canvas>
    <p id="err" style="color:#b00"></p>
  </div>
  <p>Scan with your authenticator. Local temp only.</p>
  <script>
    const uri = ${JSON.stringify(otpauth)};
    QRCode.toCanvas(document.getElementById('q'), uri, { width: 280 }, function (err) {
      if (err) document.getElementById('err').textContent = 'QR render failed';
    });
  </script>
</body>
</html>`;
}

const mfa = parseEnvFile(MFA_VAULT);
const email = mfa.RC7_MFA_OPERATOR_EMAIL;
const secret = mfa.RC7_MFA_TOTP_SECRET;
const factorPrefix = mfa.RC7_MFA_FACTOR_ID_PREFIX ?? mfa.RC7_MFA_FACTOR_ID?.slice(0, 8);
if (!email || !secret || !factorPrefix) {
  process.stderr.write('missing mfa vault fields\n');
  process.exit(1);
}

const otpauth = buildOtpAuth(email, secret);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(HTML, writeScanHtml(factorPrefix, otpauth), 'utf8');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/scan.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(HTML));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`http://${HOST}:${PORT}/scan.html\n`);
});
