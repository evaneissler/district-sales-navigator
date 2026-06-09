import { NextResponse } from "next/server";
import { listDistricts } from "@/lib/db/queries";

export async function GET() {
    const districts = await listDistricts();
    return NextResponse.json({ districts });
}
