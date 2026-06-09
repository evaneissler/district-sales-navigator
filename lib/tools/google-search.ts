import { tool } from "ai";
import { z } from "zod";

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;

export const googleSearch = tool({
    description:
        "Run a Google search. Call this multiple times with different queries to (a) locate the district's official site, then (b) find the business / finance leadership pages. Once you know the district domain, prefer site-scoped queries like `site:DOMAIN \"Chief Business Officer\"`.",

    inputSchema: z.object({
        query: z
            .string()
            .describe(
                'Free-form Google query. Examples: \'"Hays CISD" "Chief Business Officer"\', \'site:hayscisd.net CFO\', \'"Round Rock ISD" business office staff directory\'.',
            ),
    }),

    execute: async ({ query }) => {
        const data = await searchGoogle(query);

        const results = (data.organic_results ?? [])
            .slice(0, 8)
            .map((r: any) => ({
                title: r.title,
                link: r.link,
                snippet: r.snippet,
            }));

        return { query, results };
    },
});

export async function searchGoogle(query: string) {
    const params = new URLSearchParams({
        engine: "google",
        q: query,
        api_key: SERPAPI_KEY!,
    });

    const url = `https://serpapi.com/search.json?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`SerpAPI error: ${res.statusText}`);
    }

    return await res.json();
}
