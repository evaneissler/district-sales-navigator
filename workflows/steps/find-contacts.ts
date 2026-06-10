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

    const SEARCH_BUDGET = 2;
    let searchesUsed = 0;
    const budgetedSearch = tool({
        ...googleSearch,
        description: `Run a Google search. HARD LIMIT: ${SEARCH_BUDGET} calls total for this district — these are for finding the official district website ONLY, not for finding people. Once you're on the district site, you find contacts by browsing its own pages (administration / staff directory / business office), NOT by searching.`,
        execute: async (input: { query: string }, opts) => {
            if (searchesUsed >= SEARCH_BUDGET) {
                return {
                    query: input.query,
                    results: [],
                    error: `Search budget exhausted (${SEARCH_BUDGET}/${SEARCH_BUDGET} used). Stop searching. Go back to the district homepage, follow its navigation links to administration / leadership / staff directory / business office pages, and extract contacts from those.`,
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

        **CORE STRATEGY: this is a crawl of ONE website — the district's own site — not a web search.** Google is only for finding the front door. Once you're inside the district site, you find people by following the site's own navigation to its administration / leadership / staff-directory / business-office pages. Do NOT search the web for individual people or roles.

        Every browsePage call returns the page's \`links\` (each with \`href\` and \`text\`). This is your map. Read the link text and follow the internal links (same domain as the district site) that lead toward staff and leadership. You navigate by clicking through the site, the way a person would.

        **SEARCH BUDGET: ${SEARCH_BUDGET} googleSearch calls total, and ONLY to locate the official website.** After that the tool refuses. Essentially all of your work should be browsePage + extractContacts on the district's own pages.

        Workflow:

        1. **Search 1** — find the district's official website:
            "${district.name}" ${district.city} ${district.state} official
        Pick the obvious district domain from the results (look at snippets, not just titles). Keep Search 2 in reserve only if the first result is ambiguous.

        2. createBrowser ONCE with districtId="${district.id}". Reuse the returned sandboxName for every browsePage / closeBrowser call.

        3. browsePage on the homepage. When you're sure it's the official district site, call setDistrictWebsite with that URL. Note the domain (e.g. hayscisd.net) — from here on, only follow links on this domain.

        4. **Navigate the site to the right pages — do not search.** From the homepage's \`links\`, find the navigation entries that lead to people. Look for link text like: Administration, Departments, Our District / About, Leadership, Cabinet, Superintendent's Office, Staff Directory, Directory, Contact / Contact Us, Business Office, Business Services, Finance, Fiscal Services, Human Resources. Section/landing pages (e.g. "Departments", "Administration") usually list further links to the specific business/finance office and staff directory — browsePage those, then follow their links one more level down as needed.

        5. As you go, browsePage the most promising pages and follow their \`links\` deeper toward the business/finance office and staff directory. Track each page's URL — you need it as the source for saveContact. State-specific titles vary: TX districts commonly use "Chief Financial Officer" or "Assistant Superintendent for Business and Finance"; CA districts often use "Chief Business Official"; some districts just have a "Business Manager". Keep clicking through the site until you reach a page that names the business/finance leader.

        6. For each page that plausibly contains staff contacts, call extractContacts on its text. If extractContacts returns a CBO/CFO name but no email, follow the site's staff-directory link to find their email — don't spend a search on it.

        7. Call saveContact for every real contact. Always pass:
            - districtId=${district.id}
            - emailSourceUrl: the URL of the page you extracted the email from (or the page that confirmed the role, if email came from elsewhere)
            - phoneSourceUrl: the URL of the page the phone came from (omit if same as emailSourceUrl)

        8. closeBrowser once at the very end.

        Hard rules:
        - Stay on the district's own domain. Don't go off browsing unrelated websites.
        - Never save generic mailboxes (info@, contact@, webmaster@, communications@).
        - Don't call createBrowser more than once. Always reuse the same sandboxName.
        - Don't invent source URLs — only pass URLs you actually browsed.
        - Don't stop after finding only the Superintendent. The CBO/CFO is the primary target; keep navigating the site for them.
        `,
    });

    await log.done(`Finished contact search (${result.steps?.length ?? 0} steps)`);
    return { steps: result.steps?.length ?? 0 };
}
