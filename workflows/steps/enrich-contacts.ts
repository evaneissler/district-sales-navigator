import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { District } from "../types";
import {
    listContactsForDistrict,
    updateContactEnrichment,
    updateDistrictStatus,
} from "@/lib/db/queries";
import { searchGoogle } from "@/lib/tools/google-search";
import { stepLogger } from "./progress";

const linkedinSearch = tool({
    description:
        "Find a LinkedIn profile URL for a named person. Returns the most likely linkedin.com/in/<slug> URL or null.",
    inputSchema: z.object({
        name: z.string(),
        title: z.string().optional(),
        organization: z.string().optional(),
    }),
    execute: async ({ name, title, organization }) => {
        const query = `${name} ${title ?? ""} ${organization ?? ""} site:linkedin.com/in`;
        try {
            const data = await searchGoogle(query);
            const hit = (data.organic_results ?? []).find((r: any) =>
                r.link?.includes("linkedin.com/in/"),
            );
            return { url: hit?.link ?? null, title: hit?.title ?? null };
        } catch {
            return { url: null, title: null };
        }
    },
});

const phoneSearch = tool({
    description:
        "Find a direct office phone number for a named person at an organization. Returns { phone, sourceUrl } — sourceUrl is the page the phone was matched on, pass it through to recordEnrichment.",
    inputSchema: z.object({
        name: z.string(),
        organization: z.string(),
        city: z.string().optional(),
        state: z.string().optional(),
    }),
    execute: async ({ name, organization, city, state }) => {
        const query = `"${name}" "${organization}" ${city ?? ""} ${state ?? ""} phone OR contact`;
        try {
            const data = await searchGoogle(query);
            const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
            for (const r of (data.organic_results ?? []).slice(0, 5) as any[]) {
                const blob = `${r.title ?? ""}\n${r.snippet ?? ""}`;
                const match = blob.match(phoneRegex);
                if (match) {
                    return { phone: match[0], sourceUrl: r.link ?? null };
                }
            }
            return { phone: null, sourceUrl: null };
        } catch {
            return { phone: null, sourceUrl: null };
        }
    },
});

export async function enrichContacts(district: District) {
    "use step";

    await updateDistrictStatus(district.id, "researching", "enrich-contacts");
    const log = stepLogger(district.id, "enrich-contacts");

    const contacts = await listContactsForDistrict(district.id);
    if (contacts.length === 0) {
        await log.start("No contacts to enrich — skipping");
        return { enriched: 0 };
    }

    await log.start(`Enriching ${contacts.length} contacts (phone + LinkedIn)`);

    const recordEnrichment = tool({
        description: "Persist a discovered phone, LinkedIn URL, and phone source URL for a contact.",
        inputSchema: z.object({
            contactId: z.number(),
            phone: z.string().nullable().optional(),
            linkedinUrl: z.string().nullable().optional(),
            phoneSourceUrl: z
                .string()
                .nullable()
                .optional()
                .describe("URL of the page the phone number was found on. Pass the sourceUrl returned by phoneSearch."),
        }),
        execute: async ({ contactId, phone, linkedinUrl, phoneSourceUrl }) => {
            await updateContactEnrichment(contactId, {
                phone: phone ?? null,
                linkedinUrl: linkedinUrl ?? null,
                phoneSourceUrl: phoneSourceUrl ?? null,
            });
            return { success: true };
        },
    });

    const targets = contacts.map((c) => ({
        contactId: c.id,
        name: c.name,
        title: c.title,
        hasPhone: !!c.phone,
        hasLinkedin: !!c.linkedin_url,
    }));

    const result = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        stopWhen: stepCountIs(Math.min(50, contacts.length * 4 + 5)),
        tools: {
            linkedinSearch,
            phoneSearch,
            recordEnrichment,
        },
        onStepFinish: log.onStepFinish,
        prompt: `
            For each contact below, find the missing phone number and LinkedIn profile, then call recordEnrichment with what you found (pass null for fields you couldn't find — do not invent data).

            Organization: ${district.name}
            City: ${district.city}, State: ${district.state}

            Contacts:
            ${JSON.stringify(targets, null, 2)}

            Rules:
            - Only call recordEnrichment once per contact.
            - Skip a lookup if the contact already has the value (hasPhone / hasLinkedin true).
            - When phoneSearch returns a phone, ALSO pass its sourceUrl as phoneSourceUrl to recordEnrichment.
            - Verify the LinkedIn profile mentions the district or a similar role before recording it.
            - Do NOT fabricate phone numbers — only record matches found via phoneSearch.
        `,
    });

    await log.done(`Finished enrichment (${result.steps?.length ?? 0} steps)`);
    return { enriched: contacts.length, steps: result.steps?.length ?? 0 };
}
