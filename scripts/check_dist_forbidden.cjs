#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
// Limit forbidden checks to concrete, problematic leak patterns. We allow
// certain benign references (some libraries include localhost as a fallback),
// but disallow explicit local service URLs or placeholder tokens that would
// indicate developer defaults were baked into the bundle.
const forbidden = [
  'http://localhost:8001/api/v1',
  'http://127.0.0.1:8001/api/v1',
  'dev-token',
  // don't flag generic '/api/v1' references (they're fine if relative),
  // only flag absolute localhost API URLs and placeholder tokens.
];

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function (err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function (file) {
      file = path.resolve(dir, file);
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(2);
}

walk(DIST, (err, files) => {
  if (err) throw err;
  const matches = [];
  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      forbidden.forEach((pat) => {
        if (content.indexOf(pat) !== -1) {
          matches.push({ file, pat });
        }
      });
    } catch (e) {
      // binary files or huge files — ignore errors
    }
  });

  if (matches.length) {
    console.error('\nForbidden strings found in dist/ — aborting.');
    matches.slice(0, 20).forEach(m => console.error(`${m.file}: contains "${m.pat}"`));
    if (matches.length > 20) console.error(`... and ${matches.length - 20} more entries`);
    process.exit(1);
  }

  console.log('OK — no forbidden strings found in dist/');
  process.exit(0);
});
