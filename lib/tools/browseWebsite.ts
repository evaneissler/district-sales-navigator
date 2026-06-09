import { tool } from "ai";
import { z } from "zod";
import { Sandbox } from "@vercel/sandbox";

const browseScript = `
    const { chromium } = require('playwright');

    (async () => {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(process.env.TARGET_URL, { waitUntil: "networkidle" });

      const text = await page.locator("body").innerText();
      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a"))
          .map(a => ({ href: a.href, text: a.innerText.trim() }))
          .filter(x => x.href)
      );

      console.log(JSON.stringify({ text, links }));
      await browser.close();
    })();
    `;

export const createBrowser = tool({
  description:
    "Create a browser sandbox with Playwright installed. Call once before browsePage. Returns a sandboxName to pass to subsequent tools.",

  inputSchema: z.object({
    districtId: z.string(),
  }),

  execute: async ({ districtId }) => {
    const sandboxName = `browser-${districtId}-${Date.now()}`;

    await Sandbox.getOrCreate({
      name: sandboxName,
      onCreate: async (sbx) => {
        await sbx.runCommand("npm", ["install", "playwright"]);
        await sbx.runCommand("npx", ["playwright", "install", "chromium"]);
      },
    });

    return { sandboxName };
  },
});

export const browsePage = tool({
  description:
    "Visit a URL in the existing browser sandbox and return page text and links. Call createBrowser first.",

  inputSchema: z.object({
    sandboxName: z.string(),
    url: z.string(),
  }),

  execute: async ({ sandboxName, url }) => {
    const sandbox = await Sandbox.get({ name: sandboxName });

    const result = await sandbox.runCommand({
      cmd: "node",
      args: ["-e", browseScript],
      env: { TARGET_URL: url },
    });

    return JSON.parse(await result.stdout());
  },
});

export const closeBrowser = tool({
  description: "Stop the browser sandbox. Call once when done browsing.",

  inputSchema: z.object({
    sandboxName: z.string(),
  }),

  execute: async ({ sandboxName }) => {
    const sandbox = await Sandbox.get({ name: sandboxName });
    await sandbox.stop();
    return { stopped: true };
  },
});
