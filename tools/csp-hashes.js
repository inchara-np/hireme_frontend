/**
 * Prints the `sha256-...` CSP source values for every inline <script> in the
 * built output.
 *
 * Why this exists: the site is served as static assets from Cloudflare, so
 * there is no server to mint a per-request CSP nonce. Two inline scripts end
 * up in the prerendered HTML — the theme bootstrap in `src/index.html`, and
 * the event-replay dispatcher Angular injects for `withEventReplay()`.
 * Hashing them lets `script-src` stay free of `unsafe-inline`.
 *
 * Run after a build, then paste the output into `public/_headers`:
 *
 *   npm run build && npm run csp:hashes
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist', 'frontend', 'browser');

function htmlFiles(dir, found = []) {
  if (!fs.existsSync(dir)) {
    return found;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      htmlFiles(full, found);
    } else if (entry.name.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

const files = htmlFiles(DIST);
if (!files.length) {
  console.error(`No HTML found in ${DIST}. Run "npm run build" first.`);
  process.exit(1);
}

// <script> with no src and no non-executable type (JSON/importmap blocks are
// data, not script, and CSP does not apply to them).
const SCRIPT_RE = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const NON_EXEC = /type\s*=\s*["']?(application\/json|application\/ld\+json|speculationrules|importmap)/i;

const hashes = new Map();

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = SCRIPT_RE.exec(html)) !== null) {
    const [, attrs, body] = match;
    if (NON_EXEC.test(attrs) || !body.trim()) {
      continue;
    }
    const hash = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
    const source = `'sha256-${hash}'`;
    if (!hashes.has(source)) {
      hashes.set(source, path.relative(DIST, file));
    }
  }
}

if (!hashes.size) {
  console.log('No executable inline scripts found — script-src can stay as-is.');
  process.exit(0);
}

const scriptSrc = `script-src 'self' ${[...hashes.keys()].join(' ')}`;
const write = process.argv.includes('--write');

if (!write) {
  console.log(`Found ${hashes.size} distinct inline script(s):\n`);
  for (const [source, file] of hashes) {
    console.log(`  ${source}   (first seen in ${file})`);
  }
  console.log('\nscript-src directive:\n');
  console.log(`  ${scriptSrc};`);
  console.log(
    '\nRun with --write to patch dist/frontend/browser/_headers in place.'
  );
  process.exit(0);
}

// --write: rewrite the script-src directive inside the built _headers file, so
// a deploy can never ship hashes that do not match the HTML beside them.
const headersPath = path.join(DIST, '_headers');
if (!fs.existsSync(headersPath)) {
  console.error(
    `${headersPath} not found — is public/_headers still in the assets glob?`
  );
  process.exit(1);
}

const original = fs.readFileSync(headersPath, 'utf8');
const patched = original.replace(
  /script-src [^;]*/,
  scriptSrc.replace(/\$/g, '$$$$')
);

if (patched === original) {
  console.log(`CSP script-src already current (${hashes.size} hashes).`);
} else {
  fs.writeFileSync(headersPath, patched, 'utf8');
  console.log(
    `Updated CSP script-src in dist/frontend/browser/_headers (${hashes.size} hashes).`
  );
}

// Also flag drift against the committed source file, so the repo copy can be
// refreshed deliberately rather than silently rotting.
const sourceHeaders = path.resolve(__dirname, '..', 'public', '_headers');
if (fs.existsSync(sourceHeaders)) {
  const src = fs.readFileSync(sourceHeaders, 'utf8');
  const current = src.match(/script-src [^;]*/)?.[0];
  if (current && current !== scriptSrc) {
    console.log(
      '\nNote: public/_headers has different hashes than this build.\n' +
        'The deployed copy is correct. To refresh the committed source, replace\n' +
        "its script-src directive with:\n\n  " +
        scriptSrc
    );
  }
}
