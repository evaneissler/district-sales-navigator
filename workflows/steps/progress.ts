import { logDistrictEvent } from "@/lib/db/queries";

function shortenUrl(url: unknown): string {
    if (typeof url !== "string") return "";
    try {
        const u = new URL(url);
        const path = u.pathname === "/" ? "" : u.pathname;
        return `${u.host}${path}`;
    } catch {
        return url.length > 60 ? url.slice(0, 57) + "..." : url;
    }
}

function clamp(s: unknown, n = 80): string {
    const v = typeof s === "string" ? s : "";
    return v.length > n ? v.slice(0, n - 1) + "…" : v;
}

type ToolCallLike = {
    toolName?: string;
    input?: unknown;
};

export function summarizeToolCall(call: ToolCallLike): {
    kind: string;
    message: string;
} | null {
    const input = (call.input && typeof call.input === "object"
        ? (call.input as Record<string, any>)
        : {}) as Record<string, any>;
    switch (call.toolName) {
        case "googleSearch":
            return { kind: "search", message: `Searching: "${clamp(input.query)}"` };
        case "createBrowser":
            return { kind: "browser", message: "Booting browser sandbox" };
        case "browsePage":
            return { kind: "browse", message: `Checking ${shortenUrl(input.url)}` };
        case "extractContacts":
            return {
                kind: "extract",
                message: input.url
                    ? `Reading ${shortenUrl(input.url)} for contacts`
                    : "Reading page for contacts",
            };
        case "saveContact":
            return {
                kind: "found",
                message: `Saving contact ${clamp(input.name, 60)}${
                    input.title ? ` — ${clamp(input.title, 40)}` : ""
                }`,
            };
        case "setDistrictWebsite":
            return {
                kind: "found",
                message: `Found official website ${shortenUrl(input.website)}`,
            };
        case "linkedinSearch":
            return {
                kind: "search",
                message: `Looking up LinkedIn for ${clamp(input.name, 60)}`,
            };
        case "phoneSearch":
            return {
                kind: "search",
                message: `Looking up phone for ${clamp(input.name, 60)}`,
            };
        case "recordEnrichment":
            return { kind: "found", message: "Saving enrichment" };
        case "closeBrowser":
            return null;
        default:
            return null;
    }
}

export function stepLogger(districtId: number, step: string) {
    return {
        async start(message: string) {
            await logDistrictEvent(districtId, step, "start", message);
        },
        async done(message: string) {
            await logDistrictEvent(districtId, step, "done", message);
        },
        async thought(message: string, kind = "thought") {
            await logDistrictEvent(districtId, step, kind, message);
        },
        onStepFinish: async (event: any) => {
            const calls: unknown[] = event?.toolCalls ?? [];
            for (const raw of calls) {
                const summary = summarizeToolCall(raw as ToolCallLike);
                if (summary) {
                    await logDistrictEvent(
                        districtId,
                        step,
                        summary.kind,
                        summary.message,
                    );
                }
            }
        },
    };
}
