import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output, tool } from "ai";
import { z } from "zod";

const contactsSchema = z.object({
	contacts: z.array(
		z.object({
		name: z.string(),
		title: z.string(),
		email: z.string(),
		})
	),
});

export const extractContacts = tool({
	description: "Extract contacts (name, title, email, phone) from page text. Use after browsePage on staff/leadership/administration pages.",

	inputSchema: z.object({
		pageText: z.string(),
	}),

	execute: async ({ pageText }) => {
		const result = await generateText({
		model: anthropic("claude-sonnet-4-6"),
		output: Output.object({ schema: contactsSchema }),
		prompt: `Extract all staff contacts (name, title, email, phone) from the following page text. Skip entries missing an email.\n\n${pageText}`,
		});

		return result.output;
	},
});
