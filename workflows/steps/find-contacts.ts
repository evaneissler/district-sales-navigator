import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { District } from "../types";
import { googleSearch } from "@/lib/tools/google-search";
import {
    createBrowser,
    browsePage,
    closeBrowser,
} from "@/lib/tools/browseWebsite";
import { extractContacts } from "@/lib/tools/extract-contacts";
import { saveContact } from "@/lib/tools/save-contact";
import { setDistrictWebsite, updateDistrictStatus } from "@/lib/db/queries";
import { stepLogger } from "./progress";

export async function findContacts(district: District) {
    "use step";

    await updateDistrictStatus(district.id, "researching", "find-contacts");
    const log = stepLogger(district.id, "find-contacts");
    await log.start(`Looking for contacts for ${district.name}`);

    const setWebsite = tool({
        description:
            "Record the district's official website once you've confirmed it (e.g., after browsing the homepage and seeing the district name). Call this at most once.",
        inputSchema: z.object({
            website: z.string().describe("Full URL of the district's official homepage."),
        }),
        execute: async ({ website }) => {
            await setDistrictWebsite(district.id, website);
            return { saved: true };
        },
    });

    const SEARCH_BUDGET = 4;
    let searchesUsed = 0;
    const budgetedSearch = tool({
        ...googleSearch,
        description: `Run a Google search. HARD LIMIT: ${SEARCH_BUDGET} calls total for this district. Spend them deliberately. Once you know the district domain, prefer site-scoped queries like \`site:DOMAIN "Chief Business Officer"\`.`,
        execute: async (input: { query: string }, opts) => {
            if (searchesUsed >= SEARCH_BUDGET) {
                return {
                    query: input.query,
                    results: [],
                    error: `Search budget exhausted (${SEARCH_BUDGET}/${SEARCH_BUDGET} used). Work with the pages you already have — browse them, extract contacts, and save what you find.`,
                };
            }
            searchesUsed += 1;
            return await (googleSearch as any).execute(input, opts);
        },
    });

    const result = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        stopWhen: stepCountIs(40),

        tools: {
            googleSearch: budgetedSearch,
            createBrowser,
            browsePage,
            extractContacts,
            saveContact,
            setDistrictWebsite: setWebsite,
            closeBrowser,
        },

        onStepFinish: log.onStepFinish,

        prompt: `
        You are researching senior business and finance leadership at a US public school district.

        District: ${district.name}
        City: ${district.city}
        State: ${district.state}
        district_id (pass to saveContact verbatim): ${district.id}

        PRIMARY GOAL: find the district's Chief Business Officer (CBO) and Chief Financial Officer (CFO). Equivalent titles count: Assistant / Associate / Deputy Superintendent for Business or Finance, Director of Finance, Director of Business Operations / Services, Business Manager, Controller. The Superintendent is a secondary target. Everything else is a bonus.

        You decide which pages to visit. The workflow below is a guide, not a checklist — keep browsing and extracting until you have actually found the CBO/CFO (or equivalents), or have exhausted reasonable leads.

        **SEARCH BUDGET: ${SEARCH_BUDGET} googleSearch calls total. No exceptions.** After that the tool refuses. Plan your queries before you spend them — most of your work should be browsePage + extractContacts on pages you already found, not more searching.

        Workflow:

        1. **Search 1** — find the district's official website:
            "${district.name}" ${district.city} ${district.state} official
        Pick the obvious district domain from the results (look at snippets, not just titles).

        2. createBrowser ONCE with districtId="${district.id}". Reuse the returned sandboxName for every browsePage / closeBrowser call.

        3. browsePage on the homepage. When you're sure it's the official district site, call setDistrictWebsite with that URL. Note the domain (e.g. hayscisd.net).

        4. **Searches 2–4** — hunt business/finance leadership with 2–3 site-scoped queries. Combine titles into one query when you can. Examples (pick what fits, don't run all of them):
            - site:DOMAIN ("Chief Business Officer" OR "Chief Financial Officer" OR CFO OR CBO)
            - site:DOMAIN ("Assistant Superintendent" OR "Director of Finance" OR "business office")
            - site:DOMAIN (cabinet OR leadership OR administration) staff
        If site-scoped searches return nothing, drop the site: filter. State-specific titles vary — TX districts commonly use "Chief Financial Officer" or "Assistant Superintendent for Business and Finance"; CA districts often use "Chief Business Official"; some districts just have a "Business Manager".

        5. browsePage on the most promising 3–6 links from your searches — leadership / cabinet / staff directory / business office / administration / department pages. Track each page's URL; you need it as the source for saveContact. **Don't burn searches on names you could find by browsing the staff directory you already have.**

        6. For each page that plausibly contains staff contacts, call extractContacts on its text. If extractContacts returns a CBO/CFO name but no email, prefer browsing the staff directory to find their email (only spend a search on it if you have budget left and no other option).

        7. Call saveContact for every real contact. Always pass:
            - districtId=${district.id}
            - emailSourceUrl: the URL of the page you extracted the email from (or the page that confirmed the role, if email came from elsewhere)
            - phoneSourceUrl: the URL of the page the phone came from (omit if same as emailSourceUrl)

        8. closeBrowser once at the very end.

        Hard rules:
        - Never save generic mailboxes (info@, contact@, webmaster@, communications@).
        - Don't call createBrowser more than once. Always reuse the same sandboxName.
        - Don't invent source URLs — only pass URLs you actually browsed.
        - Don't stop after finding only the Superintendent. The CBO/CFO is the primary target; keep searching for them.
        `,
    });

    await log.done(`Finished contact search (${result.steps?.length ?? 0} steps)`);
    return { steps: result.steps?.length ?? 0 };
}
