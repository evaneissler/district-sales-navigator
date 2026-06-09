import { start } from "workflow/api";
import { handleNewDistrict } from "@/workflows/process-district";
import { NextResponse } from "next/server";
import { upsertDistrict } from "@/lib/db/queries";

export async function POST(request: Request) {
    const { district_name, city, state } = await request.json();

    if (!district_name || !city || !state) {
        return NextResponse.json(
            { error: "district_name, city, state are required" },
            { status: 400 },
        );
    }

    const districtId = await upsertDistrict(district_name, city, state);

    await start(handleNewDistrict, [district_name, city, state]);

    return NextResponse.json({ districtId });
}
