import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { getDistrict } from "@/lib/db/queries";
import { rerunDistrictStep, type RerunStep } from "@/workflows/process-district";

const VALID_STEPS: RerunStep[] = [
    "find-contacts",
    "enrich-contacts",
    "find-booster-clubs",
];

export async function POST(
    req: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const { id } = await ctx.params;
    const districtId = Number(id);
    if (!Number.isFinite(districtId)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { step } = (await req.json()) as { step?: string };
    if (!step || !VALID_STEPS.includes(step as RerunStep)) {
        return NextResponse.json(
            { error: `step must be one of ${VALID_STEPS.join(", ")}` },
            { status: 400 },
        );
    }

    const row = await getDistrict(districtId);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await start(rerunDistrictStep, [
        { id: row.id, name: row.name, city: row.city, state: row.state },
        step as RerunStep,
    ]);

    return NextResponse.json({ ok: true, step });
}
