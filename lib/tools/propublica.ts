import { tool } from "ai";
import { z } from "zod";

type RawOrg = {
    ein: number;
    strein?: string;
    name?: string;
    city?: string | null;
    state?: string | null;
    ntee_code?: string | null;
    raw_ntee_code?: string | null;
};

export const searchNonprofits = tool({
    description:
        "Search the ProPublica Nonprofit Explorer (IRS 501(c)(3) database) by free-text query and state. Use this to discover candidate booster clubs by city or school name, then judge from the results which ones to save. Returns up to 25 organizations per call.",

    inputSchema: z.object({
        q: z
            .string()
            .describe(
                'Search query, e.g. "Austin booster", "Westwood High School Booster", "Round Rock band boosters".',
            ),
        state: z.string().length(2).describe("Two-letter state code, e.g. TX."),
    }),

    execute: async ({ q, state }) => {
        const params = new URLSearchParams({
            q,
            "state[id]": state,
            "c_code[id]": "3",
        });
        const url = `https://projects.propublica.org/nonprofits/api/v2/search.json?${params.toString()}`;

        const res = await fetch(url);
        if (!res.ok) {
            return { query: q, state, total: 0, results: [], error: `ProPublica error: ${res.status} ${res.statusText}` };
        }
        const data = (await res.json()) as { total_results?: number; organizations?: RawOrg[] };

        const results = (data.organizations ?? []).slice(0, 25).map((o) => ({
            ein: String(o.ein).padStart(9, "0"),
            name: o.name ?? "",
            city: o.city ?? null,
            state: o.state ?? null,
            ntee_code: o.ntee_code ?? o.raw_ntee_code ?? null,
        }));

        return { query: q, state, total: data.total_results ?? results.length, results };
    },
});
