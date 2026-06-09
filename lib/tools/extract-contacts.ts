import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, tool } from "ai";
import { z } from "zod";

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
        "Extract staff contacts (name, title, email, phone) from page text. Use after browsePage on staff / leadership / administration / business-office pages. Prioritizes business and finance leadership.",

    inputSchema: z.object({
        pageText: z.string(),
    }),

    execute: async ({ pageText }) => {
        const result = await generateText({
            model: anthropic("claude-sonnet-4-6"),
            output: Output.object({ schema: contactsSchema }),
            prompt: `Extract staff contacts (name, title, email, phone) from the page text below.

PRIORITIZE these roles (capture them even if email is missing, as long as a phone number is present):
- Chief Business Officer (CBO)
- Chief Financial Officer (CFO)
- Assistant / Associate / Deputy Superintendent for Business or Finance
- Director of Finance / Director of Business Operations / Director of Business Services
- Business Manager
- Controller
- Superintendent

For all other roles, require an email — skip entries that have only a name and title.

Never return generic mailboxes (info@, contact@, webmaster@, communications@). Skip them.

Page text:

${pageText}`,
        });

        return result.output;
    },
});
