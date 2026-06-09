import { tool } from "ai";
import { z } from "zod";

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;

export const googleSearch = tool({
    description: "Find the official website for a school district",

    inputSchema: z.object({
        district: z.string(),
        city: z.string(),
        state: z.string(),
    }),

    execute: async ({ district, city, state }) => {
        const query = `"${district}" ${city} ${state} official school district website`;

        const data = await searchGoogle(query);

        const results = (data.organic_results ?? [])
        .filter((r: any) => r.link?.includes(".edu") || r.link?.includes(".org"))
        .slice(0, 5)
        .map((r: any) => ({
            title: r.title,
            link: r.link,
        }));

        return {
        query,
        websites: results,
        };
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