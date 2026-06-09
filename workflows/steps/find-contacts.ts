import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { District } from "../types";
import { googleSearch } from "@/lib/tools/google-search";
import {
  createBrowser,
  browsePage,
  closeBrowser,
} from "@/lib/tools/browseWebsite";
import { extractContacts } from "@/lib/tools/extract-contacts";
import { saveContact } from "@/lib/tools/save-contact";

export async function findContacts(district: District) {
    "use step";

    const result = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        stopWhen: stepCountIs(20),

        tools: {
        googleSearch,
        createBrowser,
        browsePage,
        extractContacts,
        saveContact,
        closeBrowser,
        },

        prompt: `
            Find contacts for:

            District: ${district.name}
            City: ${district.city}
            State: ${district.state}

            Workflow:
            1. Call googleSearch to find the district's official website.
            2. Call createBrowser ONCE with districtId="${district.name}". Keep the returned sandboxName for every later browsePage / closeBrowser call.
            3. Call browsePage on the homepage. Inspect the returned links for promising pages (staff directory, administration, leadership, contact).
            4. Call browsePage on each promising link.
            5. For each page that likely contains contacts, call extractContacts with that page's text.
            6. Call saveContact for every contact found.
            7. Call closeBrowser once at the very end.

            Do not call createBrowser more than once. Always reuse the same sandboxName.
        `,
    });

    return result;
}
