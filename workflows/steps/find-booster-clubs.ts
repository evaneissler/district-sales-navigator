import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { District } from "../types";
import {
    linkClubToDistrict,
    updateDistrictStatus,
    upsertBoosterClub,
} from "@/lib/db/queries";
import { searchNonprofits } from "@/lib/tools/propublica";
import { searchGoogle } from "@/lib/tools/google-search";
import { stepLogger } from "./progress";

async function discoverSchools(district: District): Promise<string> {
    try {
        const data = await searchGoogle(
            `"${district.name}" high schools`,
        );
        const snippets = (data.organic_results ?? [])
            .slice(0, 6)
            .map((r: any) => `- ${r.title}\n  ${r.snippet ?? ""}`)
            .join("\n");
        return snippets || "(no results)";
    } catch {
        return "(school discovery search failed — proceed without this context)";
    }
}

const stateAbbr: Record<string, string> = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
    colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
    hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
    kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
    massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
    montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
    ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
    "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
    vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
    wisconsin: "WI", wyoming: "WY",
};

function toAbbr(s: string): string {
    if (s.length === 2) return s.toUpperCase();
    return stateAbbr[s.toLowerCase()] ?? s.toUpperCase();
}

export async function findBoosterClubs(district: District) {
    "use step";

    await updateDistrictStatus(district.id, "researching", "find-booster-clubs");
    const log = stepLogger(district.id, "find-booster-clubs");

    const stateCode = toAbbr(district.state);
    await log.start(
        `Searching IRS nonprofits in ${district.city}, ${stateCode} for high school booster clubs`,
    );

    const schoolContext = await discoverSchools(district);

    const saveBoosterClub = tool({
        description:
            "Save a confirmed high-school booster club and link it to this district. Call ONCE per club. confidence is your 0–1 estimate that this organization is a high school booster club serving this district.",
        inputSchema: z.object({
            ein: z.string().describe("9-digit EIN, exactly as returned by searchNonprofits."),
            name: z.string(),
            city: z.string().optional(),
            state: z.string().optional(),
            nteeCode: z.string().optional(),
            confidence: z.number().min(0).max(1),
        }),
        execute: async ({ ein, name, city, state, nteeCode, confidence }) => {
            await upsertBoosterClub({
                ein,
                name,
                city: city ?? null,
                state: state ?? null,
                nteeCode: nteeCode ?? null,
            });
            await linkClubToDistrict(district.id, ein, confidence);
            return { saved: true };
        },
    });

    const result = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        stopWhen: stepCountIs(30),
        tools: { searchNonprofits, saveBoosterClub },
        onStepFinish: log.onStepFinish,
        prompt: `
            Find high school booster clubs serving ${district.name} in ${district.city}, ${stateCode}.

            High schools in this district (from a Google search — extract school names and their towns from these snippets; some schools may sit in smaller towns within the district's boundaries, not in ${district.city}):
            ${schoolContext}

            Use searchNonprofits to query the IRS 501(c)(3) registry. Build queries from the SCHOOL NAMES you identified above, not just from ${district.city}. Examples:
              - "<School Name> booster"
              - "<School Name> athletic boosters"
              - "<School Name> band boosters"
              - "${district.city} booster" (as one broad pass)

            A high school booster club is a 501(c)(3) that supports a SPECIFIC high school's sports, band, choir, theater, or similar activity. Names typically look like:
              - "[School] Booster Club"
              - "[School] Athletic Booster Club"
              - "[School] Band Boosters"
              - "Friends of [School] [Activity]"
              - "[School] [Sport] Boosters"

            EXCLUDE:
              - PTAs / PTOs (parent-teacher groups)
              - District-wide education foundations
              - Youth sports leagues unaffiliated with a high school
              - Anything not obviously tied to a high school in this district

            DO NOT filter by city. Booster clubs file their EIN at the treasurer's home address, which is often a neighboring town. The reliable signal is the SCHOOL NAME in the org name — if the name clearly references a high school you identified above (or another high school you can verify is in ${district.name}), save it regardless of which city the EIN is registered in.

            For each booster club you confirm, call saveBoosterClub ONCE with:
              - ein, name, city, state, nteeCode (verbatim from the search result)
              - confidence in [0.5, 1.0] — higher when the name explicitly contains a high school from the district and a booster keyword. Lower when the school affiliation is ambiguous.

            Stop once you've exhausted reasonable searches (typically 4–8 queries). Do not save the same EIN twice.
        `,
    });

    await log.done(`Finished booster club search (${result.steps?.length ?? 0} steps)`);
    return { steps: result.steps?.length ?? 0 };
}
