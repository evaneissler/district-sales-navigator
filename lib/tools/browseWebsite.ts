import { tool } from "ai";
import { z } from "zod";
import { Sandbox } from "@vercel/sandbox";

// Runs INSIDE the sandbox. Plain HTTP fetch of the served HTML (no headless
// browser / no JS engine), then strip it to readable text + the same-host link
// list — the same approach as the proven Lambda scraper. Using String.raw so the
// regex backslashes survive into the sandbox verbatim; the script must contain no
// `${...}` (raw templates still interpolate those).
const fetchScript = String.raw`
  const https = require('https');
  const http = require('http');

  const TARGET = process.env.TARGET_URL;
  const HTTP_TIMEOUT = 20000;
  const MAX_BODY = 500000;

  function httpGet(url, redirects) {
    redirects = redirects || 0;
    return new Promise((resolve, reject) => {
      if (redirects > 5) return reject(new Error('too many redirects'));
      const isHttps = url.startsWith('https');
      const mod = isHttps ? https : http;
      const req = mod.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (loc.startsWith('/')) {
            try { const u = new URL(url); loc = u.protocol + '//' + u.host + loc; } catch (e) {}
          }
          res.destroy();
          return httpGet(loc, redirects + 1).then(resolve).catch(reject);
        }
        let d = '';
        res.on('data', (c) => {
          d += c;
          if (d.length > MAX_BODY) { res.destroy(); resolve({ status: res.statusCode, body: d, finalUrl: url }); }
        });
        res.on('end', () => resolve({ status: res.statusCode, body: d, finalUrl: url }));
        res.on('error', reject);
      });
      req.setTimeout(HTTP_TIMEOUT, () => req.destroy(new Error('timeout')));
      req.on('error', reject);
    });
  }

  function prepare(html, pageUrl) {
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);

    const linkRe = /href=["']([^"'#?][^"']*?)["'][^>]*?>([^<]{0,80})<\/a>/gi;
    const links = [];
    const seen = new Set();
    let base = null;
    try { base = new URL(pageUrl); } catch (e) {}
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      let href = m[1].trim();
      const t = m[2].replace(/\s+/g, ' ').trim();
      if (!t) continue;
      if (href.startsWith('/') && base) href = base.protocol + '//' + base.host + href;
      if (!href.startsWith('http')) continue;
      try { if (new URL(href).hostname !== (base && base.hostname)) continue; } catch (e) { continue; }
      if (seen.has(href)) continue;
      seen.add(href);
      links.push({ href: href, text: t });
    }
    return { text: text, links: links.slice(0, 60) };
  }

  (async () => {
    try {
      const res = await httpGet(TARGET);
      if (res.status !== 200) {
        console.log(JSON.stringify({ status: res.status, text: '', links: [], error: 'HTTP ' + res.status }));
        return;
      }
      const parsed = prepare(res.body, res.finalUrl || TARGET);
      console.log(JSON.stringify({ status: 200, text: parsed.text, links: parsed.links }));
    } catch (e) {
      console.log(JSON.stringify({ status: 0, text: '', links: [], error: String((e && e.message) || e) }));
    }
  })();
`;

export const createBrowser = tool({
  description:
    "Create a sandbox for reading district web pages. Call once before browsePage. Returns a sandboxName to pass to subsequent tools.",

  inputSchema: z.object({
    districtId: z.string(),
  }),

  execute: async ({ districtId }) => {
    const sandboxName = `browser-${districtId}-${Date.now()}`;

    // A bare sandbox already ships with Node; we only need its built-in http(s)
    // modules to fetch pages, so there's nothing to install on create.
    await Sandbox.getOrCreate({ name: sandboxName });

    return { sandboxName };
  },
});

export const browsePage = tool({
  description:
    "Fetch a URL inside the sandbox and return the page's readable text plus the same-domain links found on it (each { href, text }). Follow those links to navigate the district site. Call createBrowser first.",

  inputSchema: z.object({
    sandboxName: z.string(),
    url: z.string(),
  }),

  execute: async ({ sandboxName, url }) => {
    const sandbox = await Sandbox.get({ name: sandboxName });

    const result = await sandbox.runCommand({
      cmd: "node",
      args: ["-e", fetchScript],
      env: { TARGET_URL: url },
    });

    const out = await result.stdout();
    try {
      return JSON.parse(out);
    } catch {
      return {
        status: 0,
        text: "",
        links: [],
        error: "Could not read page",
        raw: (out || "").slice(0, 200),
      };
    }
  },
});

export const closeBrowser = tool({
  description: "Stop the sandbox. Call once when done browsing.",

  inputSchema: z.object({
    sandboxName: z.string(),
  }),

  execute: async ({ sandboxName }) => {
    const sandbox = await Sandbox.get({ name: sandboxName });
    await sandbox.stop();
    return { stopped: true };
  },
});
