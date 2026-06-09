import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

let cache: Promise<Set<string>> | null = null;

export function getKnownEins(): Promise<Set<string>> {
    if (!cache) cache = load();
    return cache;
}

async function load(): Promise<Set<string>> {
    const path = join(process.cwd(), "data", "eins.csv");
    if (!existsSync(path)) return new Set();

    const text = await readFile(path, "utf8");
    const set = new Set<string>();

    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;

        const first = line.split(",")[0].trim().replace(/^"|"$/g, "");
        if (first.toLowerCase() === "ein") continue;

        const digits = first.replace(/[^0-9]/g, "");
        if (digits.length === 9) set.add(digits);
        else if (digits.length === 8) set.add("0" + digits);
    }

    return set;
}
