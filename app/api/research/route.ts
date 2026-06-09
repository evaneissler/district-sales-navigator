import { start } from "workflow/api";
import { handleNewDistrict } from "@/workflows/process-district";
import { NextResponse } from "next/server";
export async function POST(request: Request) {
    const { district_name, city, state } = await request.json();

    await start(handleNewDistrict, [district_name, city, state]);

    return NextResponse.json({
        message: "District processing workflow started",
    });
}