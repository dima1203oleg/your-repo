#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const forbidden = [
  'http://localhost',
  '127.0.0.1',
  '0.0.0.0',
  'dev-token',
  'NEXT_PUBLIC_API_URL',
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
