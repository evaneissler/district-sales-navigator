import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, tool } from "ai";
import { z } from "zod";
import { fetchPageText } from "./browseWebsite";

const contactsSchema = z.object({
    contacts: z.array(
        z.object({
            name: z.string(),
            title: z.string(),
            email: z.string().optional(),
            phone: z.string().optional(),
        }),
    ),
});

export const extractContacts = tool({
    description:
        "Read a page by its URL and extract staff contacts (name, title, email, phone). Use on staff / leadership / administration / business-office pages. Re-fetches the full page, so pass the URL — not page text. Prioritizes business and finance leadership.",

    inputSchema: z.object({
        sandboxName: z.string().describe("The sandboxName from createBrowser."),
        url: z.string().describe("URL of the page to read for contacts (one you already browsed)."),
    }),

    execute: async ({ sandboxName, url }) => {
        const { text: pageText, status, error } = await fetchPageText(sandboxName, url);
        if (!pageText) {
            return { contacts: [], error: error ?? `No readable text (status ${status})` };
        }

        const result = await generateText({
            model: anthropic("claude-sonnet-4-6"),
            output: Output.object({ schema: contactsSchema }),
            prompt: `Extract staff contacts (name, title, email, phone) from the page text below.

ALWAYS capture these roles even if no email or phone is shown — a name + title alone is valuable (a rep can follow up via the main office):
- Chief Business Officer (CBO) / Chief Financial Officer (CFO)
- Assistant / Associate / Deputy Superintendent for Business or Finance
- Director of Finance / Director of Business Operations / Director of Business Services
- Business Manager / Treasurer / Controller
- Superintendent

When a phone is shown for these roles, include it — keep any extension (e.g. "812-623-2291 ext. 10907"). Include the email if shown.

For all OTHER roles, require an email — skip entries that have only a name and title. Limit to only district administrators and staff — skip teachers, principals, coaches, counselors, etc. Focus on people who are likely to be involved in booster club decisions.

Never return generic mailboxes (info@, contact@, webmaster@, communications@). Skip them.

Page text:

${pageText}`,
        });

        return result.output;
    },
});
