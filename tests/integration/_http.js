const http = require('http');
const https = require('https');
const { parse } = require('node:url');

const getJSON = (url, timeout = 5000) => new Promise((resolve, reject) => {
  const parsed = parse(url);
  const lib = (parsed.protocol && parsed.protocol.startsWith('https')) ? https : http;
  const req = lib.get(url, { timeout }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        const contentType = String(res.headers['content-type'] || '');
        if (!contentType.includes('application/json')) {
          return reject(new Error('Unexpected content-type: ' + contentType));
        }
        resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
      } catch (e) {
        reject(e);
      }
    });
  });
  req.on('error', reject);
  req.on('timeout', () => { req.destroy(new Error('timeout')); });
});

module.exports = { getJSON };
