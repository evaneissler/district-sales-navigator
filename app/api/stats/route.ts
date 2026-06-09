import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureSchema } from "@/lib/db/schema";
import { getKnownEins } from "@/lib/known-eins";

export const runtime = "nodejs";

export async function GET() {
    await ensureSchema();
    const knownEins = await getKnownEins();

    const { rows } = await sql<{
        districts: number;
        contacts: number;
        clubs_in_districts: number;
    }>`
        SELECT
            (SELECT COUNT(*)::int FROM districts)      AS districts,
            (SELECT COUNT(*)::int FROM contacts)       AS contacts,
            (SELECT COUNT(*)::int FROM district_clubs) AS clubs_in_districts;
    `;

    let customer_matches = 0;
    if (knownEins.size > 0) {
        const { rows: links } = await sql<{ ein: string }>`SELECT ein FROM district_clubs;`;
        for (const l of links) if (knownEins.has(l.ein)) customer_matches++;
    }

    return NextResponse.json({
        ...rows[0],
        customer_matches,
        known_size: knownEins.size,
    });
}
