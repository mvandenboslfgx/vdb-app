/**
 * Canonical Maestro device-suite discovery.
 * Executable flows = maestro/<NN>-*.yaml at the suite root.
 * Excludes: shared helpers, device-suite wrappers, legacy underscore skeletons.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'maestro');
const FLOW_RE = /^\d{2}-[a-z0-9-]+\.yaml$/i;

/** @returns {string[]} Absolute paths sorted by numeric prefix then name. */
export function listExecutableFlowPaths() {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isFile() && FLOW_RE.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => {
      const na = Number(a.slice(0, 2));
      const nb = Number(b.slice(0, 2));
      if (na !== nb) return na - nb;
      return a.localeCompare(b);
    })
    .map((name) => path.join(ROOT, name));
}

/** @returns {string[]} Basenames only. */
export function listExecutableFlowNames() {
  return listExecutableFlowPaths().map((p) => path.basename(p));
}

export function getSuiteManifest() {
  const flows = listExecutableFlowNames();
  const excluded = fs.existsSync(ROOT)
    ? fs.readdirSync(ROOT, { withFileTypes: true }).flatMap((d) => {
        if (d.isDirectory() && d.name === 'shared') {
          return fs
            .readdirSync(path.join(ROOT, 'shared'))
            .filter((f) => f.endsWith('.yaml'))
            .map((f) => `shared/${f} (helper)`);
        }
        if (!d.isFile() || !d.name.endsWith('.yaml')) return [];
        if (FLOW_RE.test(d.name)) return [];
        if (d.name.startsWith('device-suite')) return [`${d.name} (suite wrapper)`];
        if (/^\d{2}_/.test(d.name)) return [`${d.name} (legacy underscore skeleton)`];
        if (d.name.startsWith('_')) return [`${d.name} (probe)`];
        return [`${d.name} (excluded)`];
      })
    : [];

  const numbers = flows.map((f) => Number(f.slice(0, 2)));
  const gaps = [];
  if (numbers.length > 0) {
    for (let n = numbers[0]; n <= numbers[numbers.length - 1]; n += 1) {
      if (!numbers.includes(n)) gaps.push(String(n).padStart(2, '0'));
    }
  }

  return {
    root: ROOT,
    count: flows.length,
    flows,
    excluded,
    numberingGaps: gaps,
    expectedScoreLabel: `${flows.length}/${flows.length}`,
    rule: 'maestro/<NN>-<slug>.yaml at suite root; helpers/wrappers/legacy excluded',
  };
}

export function writeSuiteManifestMarkdown(targetPath) {
  const m = getSuiteManifest();
  const lines = [
    '# Maestro suite manifest',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Rule',
    '',
    'Executable device flows are YAML files matching `^\\d{2}-[a-z0-9-]+\\.yaml$` directly under `maestro/`.',
    '',
    '- Included: numbered hyphen flows (`01-customer-auth.yaml`, …).',
    '- Excluded: `shared/*` helpers, `device-suite*.yaml` wrappers, legacy `NN_*.yaml` skeletons, `_probe*` files.',
    '',
    '## Denominator',
    '',
    `| Field | Value |`,
    `|---|---|`,
    `| Executable flows | **${m.count}** |`,
    `| Score label | **${m.expectedScoreLabel} PASS** |`,
    `| Numbering gaps | ${m.numberingGaps.length ? m.numberingGaps.join(', ') : '(none)'} |`,
    '',
    '**Note:** Flow files jump from `17-…` to `19-…` (no `18-…`). Reporting “16–21” means file prefixes, not a count of 21 flows.',
    '',
    '## Executable order',
    '',
    ...m.flows.map((f, i) => `${i + 1}. \`${f}\``),
    '',
    '## Excluded',
    '',
    ...(m.excluded.length ? m.excluded.map((e) => `- \`${e}\``) : ['- (none)']),
    '',
  ];
  fs.writeFileSync(targetPath, `${lines.join('\n')}\n`, 'utf8');
  return m;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.resolve('docs', 'maestro-suite-manifest.md');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const m = writeSuiteManifestMarkdown(out);
  console.log(`Wrote ${out}`);
  console.log(`EXECUTABLE_FLOWS=${m.count}`);
  console.log(`SCORE_LABEL=${m.expectedScoreLabel}`);
  console.log(m.flows.join('\n'));
}
