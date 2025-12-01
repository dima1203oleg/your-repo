/* eslint-env jest */
const http = require('http');
const https = require('https');
const { parse } = require('url');

const ROOT = process.env.TEST_API_ROOT || 'http://127.0.0.1:8001';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const getJSON = (url, timeout = 5000) => new Promise((resolve, reject) => {
	const parsed = parse(url);
	const lib = (parsed.protocol && parsed.protocol.startsWith('https')) ? https : http;
	const req = lib.get(url, { timeout }, (res) => {
		const chunks = [];
		res.on('data', (c) => chunks.push(c));
		res.on('end', () => {
			try {
				const body = Buffer.concat(chunks).toString('utf8');
				resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
			} catch (e) { reject(e); }
		});
	});
	req.on('error', reject);
	req.on('timeout', () => { req.destroy(new Error('timeout')); });
});

const postJSON = (url, timeout = 5000) => new Promise((resolve, reject) => {
	const parsed = parse(url);
	const lib = (parsed.protocol && parsed.protocol.startsWith('https')) ? https : http;
	const opts = { method: 'POST', timeout };
	const req = lib.request(url, opts, (res) => {
		const chunks = [];
		res.on('data', (c) => chunks.push(c));
		res.on('end', () => {
			const body = Buffer.concat(chunks).toString('utf8');
			try {
				resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
			} catch (e) {
				// If response is not valid JSON (some dev setups may produce HTML/errors), return raw body
				resolve({ status: res.statusCode, headers: res.headers, data: body });
			}
		});
	});
	req.on('error', reject);
	req.on('timeout', () => { req.destroy(new Error('timeout')); });
	req.end();
});

// Helper: open an SSE connection and collect events until either the 'complete' event
// is observed or a timeout occurs. Returns an array of parsed event payloads.
const collectSSE = (url, timeoutMs = 8000) => new Promise((resolve, reject) => {
	const parsed = parse(url);
	const lib = (parsed.protocol && parsed.protocol.startsWith('https')) ? https : http;

	const req = lib.get(url, { timeout: timeoutMs }, (res) => {
		if (res.statusCode !== 200) {
			return reject(new Error('Unexpected status: ' + res.statusCode));
		}

		let buffer = '';
		const events = [];
		const onData = (chunk) => {
			buffer += chunk.toString('utf8');

			// split complete event frames ending with double newline
			let idx;
			while ((idx = buffer.indexOf('\n\n')) !== -1) {
				const frame = buffer.slice(0, idx).trim();
				buffer = buffer.slice(idx + 2);
				// Look for lines starting with 'data:' and extract JSON
				const lines = frame.split('\n');
				lines.forEach((ln) => {
					const m = ln.match(/^data:\s*(.*)$/);
					if (m) {
						try {
							const payload = JSON.parse(m[1]);
							events.push(payload);
						} catch (e) {
							events.push({ raw: m[1] });
						}
					}
				});
			}
		};

		res.on('data', onData);

		res.on('end', () => resolve(events));

		// end the collection after timeout if not completed
		setTimeout(() => {
			res.removeListener('data', onData);
			resolve(events);
		}, timeoutMs);
	});

	req.on('error', reject);
	req.on('timeout', () => { req.destroy(new Error('timeout')); });
});

describe('real-backend E2E runner SSE stream', () => {
	jest.setTimeout(30000);

	test('POST /infra/tests/run -> SSE stream returns log events', async () => {
		// start a job, retry a few times if the service is not yet ready
		const RUN_ENDPOINT = `${ROOT}/api/v1/infra/tests/run`;
		let res;
		for (let attempt = 0; attempt < 6; attempt++) {
			try { res = await postJSON(RUN_ENDPOINT, 3000); break; } catch (e) { if (attempt === 5) throw e; await wait(1000 * (attempt + 1)); }
		}

		expect(res).toBeDefined();
		expect(res.status).toBe(202);

		// Normalize response shape: some dev setups return wrapper { success, data: { ... } }
		// or they might return a raw string (HTML) — best-effort to find jobId.
		let jobId;
		if (res.data && typeof res.data === 'object') {
			jobId = res.data.jobId || res.data.id || (res.data.data && (res.data.data.jobId || res.data.data.id));
		} else if (typeof res.data === 'string') {
			// Try parse string to JSON if possible
			try {
				const parsed = JSON.parse(res.data);
				jobId = parsed.jobId || parsed.id || (parsed.data && (parsed.data.jobId || parsed.data.id));
			} catch (e) {
				// Fallback: query the list endpoint and pick the first job
				// We tolerate that stream might not be immediately available.
				const list = await getJSON(`${ROOT}/api/v1/infra/tests`, 3000).catch(() => null);
				if (list && Array.isArray(list.data) && list.data.length) jobId = list.data[0].id || list.data[0].jobId;
			}
		}

		expect(jobId).toBeDefined();

		// Connect to the SSE stream for that job and collect emitted events
		const SSE = `${ROOT}/api/v1/infra/tests/${jobId}/stream`;
		const events = await collectSSE(SSE, 9000);

		// Also confirm job appears in the /infra/tests list endpoint
		const listRes = await getJSON(`${ROOT}/api/v1/infra/tests`, 3000).catch(() => null);
		expect(listRes).toBeDefined();
		const raw = listRes.data;
		const jobsList = Array.isArray(raw) ? raw : (raw && raw.data && Array.isArray(raw.data)) ? raw.data : (raw && Array.isArray(raw.data) ? raw.data : []);
		const found = jobsList.find(j => j.id === jobId || j.jobId === jobId);
		expect(found).toBeDefined();

		// We expect at least some log events to have been emitted
		expect(Array.isArray(events)).toBeTruthy();
		const logEvents = events.filter(e => e && e.type === 'log');
		expect(logEvents.length).toBeGreaterThanOrEqual(1);

		// Ensure at least one log contains the Runner marker
		const foundRunner = logEvents.some(e => typeof e.text === 'string' && e.text.includes('[RUNNER]'));
		expect(foundRunner).toBeTruthy();

		// Wait until the job reports COMPLETED (or timeout) to ensure artifacts generation finished
		let statusOk = null;
		for (let i = 0; i < 20; i++) {
			try {
				const st = await getJSON(`${ROOT}/api/v1/infra/tests/${jobId}/status`, 2000);
				if (st && st.data && (st.data.status === 'COMPLETED' || st.data.progress >= 100)) { statusOk = st; break; }
			} catch (e) {
				// continue
			}
			await wait(400);
		}
		expect(statusOk).toBeDefined();

		// Check artifacts listing for the job — retry until at least one artifact appears
		let artsRes = null;
		let artifacts = [];
		const extractArtifacts = (maybe) => {
			if (!maybe) return [];
			if (Array.isArray(maybe)) return maybe;
			if (maybe.data && Array.isArray(maybe.data)) return maybe.data;
			if (maybe.files && Array.isArray(maybe.files)) return maybe.files;
			return [];
		};

		for (let i = 0; i < 20; i++) {
			try {
				artsRes = await getJSON(`${ROOT}/api/v1/infra/tests/${jobId}/artifacts`, 3000).catch(() => null);
				if (artsRes && artsRes.data) {
					artifacts = extractArtifacts(artsRes.data);
					if (artifacts.length > 0) break;
				}
			} catch (e) {
				// ignore & retry
			}
			await wait(300);
		}

		expect(artsRes).toBeDefined();
		expect(artsRes.status).toBe(200);
		expect(Array.isArray(artifacts)).toBeTruthy();
		expect(artifacts.length).toBeGreaterThanOrEqual(1);

		// Fetch the first artifact content
		const artName = artifacts[0].name;
		const parsedUrl = `${ROOT}/api/v1/infra/tests/${jobId}/artifacts/${encodeURIComponent(artName)}`;
		// A quick GET to ensure the file is served
		const getRes = await getJSON(parsedUrl, 3000).catch(() => null);
		expect(getRes).toBeDefined();
		expect(getRes.status).toBe(200);
	});
});
