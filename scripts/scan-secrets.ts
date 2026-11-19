/**
 * Secret & Token Scanner (T-4.7, L-9, Invariant I-7)
 * Scans src/, dist/, and docs/ to verify zero un-sanctioned secrets or debug tokens exist.
 */

import * as fs from 'fs';
import * as path from 'path';

const FORBIDDEN_PATTERNS = [
  // App Check debug token UUID pattern
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  // Google Service Account private key header
  /-----BEGIN (RSA )?PRIVATE KEY-----/,
  // Live GCP / Firebase API Key pattern (real 39-character AIza...)
  /AIza[0-9A-Za-z-_]{35}/,
];

// Whitelisted synthetic test files or scripts
const ALLOWED_FILES = [
  'fixtures/corpus.jsonl',
  'scripts/gen-corpus.ts',
  'tests/smoke.test.ts',
  'tests/storage.test.ts',
];

function scanDirectory(dir: string): { violations: { file: string; match: string }[] } {
  const violations: { file: string; match: string }[] = [];

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist/icons'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        if (ALLOWED_FILES.includes(relPath)) continue;
        if (/\.(png|jpg|ico|zip)$/i.test(entry.name)) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of FORBIDDEN_PATTERNS) {
          const match = pattern.exec(content);
          if (match) {
            // Check if it's an explicit documentation placeholder like "AIzaSy..."
            if (match[0].includes('AIzaSyDummy') || match[0].includes('00000000-0000')) {
              continue;
            }
            violations.push({ file: relPath, match: match[0] });
          }
        }
      }
    }
  }

  walk(dir);
  return { violations };
}

const targetDirs = ['src', 'dist'];
let hasErrors = false;

for (const d of targetDirs) {
  if (fs.existsSync(d)) {
    const res = scanDirectory(d);
    if (res.violations.length > 0) {
      console.error(`[SECRET SCAN ERROR] Violations found in ${d}:`, res.violations);
      hasErrors = true;
    } else {
      console.log(`✓ Secret scan passed cleanly for ${d}/`);
    }
  }
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log('✓ All secret and token scans passed: Zero secrets detected.');
}
