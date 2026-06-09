import { tool } from "ai";
import { z } from "zod";
import { insertContact } from "@/lib/db/queries";

export const saveContact = tool({
    description:
        "Save a contact found on a district website to Postgres. Pass emailSourceUrl (and phoneSourceUrl if the phone came from a different page) so we know where each value was scraped from.",

    inputSchema: z.object({
        districtId: z.number(),
        name: z.string(),
        email: z.string().optional(),
        title: z.string().optional(),
        phone: z.string().optional(),
        emailSourceUrl: z
            .string()
            .optional()
            .describe("URL of the page the email was extracted from."),
        phoneSourceUrl: z
            .string()
            .optional()
            .describe(
                "URL of the page the phone was extracted from. Omit if same as emailSourceUrl.",
            ),
    }),

    execute: async ({
        districtId,
        name,
        email,
        title,
        phone,
        emailSourceUrl,
        phoneSourceUrl,
    }) => {
        const id = await insertContact({
            districtId,
            name,
            email,
            title,
            phone,
            emailSourceUrl,
            phoneSourceUrl: phoneSourceUrl ?? (phone ? emailSourceUrl : undefined),
        });
        return { id, success: true };
    },
});
