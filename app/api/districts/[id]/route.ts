import { NextResponse } from "next/server";
import {
    getDistrict,
    listContactsForDistrict,
    listClubsForDistrict,
    listDistrictEvents,
    deleteDistrict,
} from "@/lib/db/queries";

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const { id } = await ctx.params;
    const districtId = Number(id);

    if (!Number.isFinite(districtId)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const district = await getDistrict(districtId);
    if (!district) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [contacts, clubs, events] = await Promise.all([
        listContactsForDistrict(districtId),
        listClubsForDistrict(districtId),
        listDistrictEvents(districtId),
    ]);

    return NextResponse.json({ district, contacts, clubs, events });
}

export async function DELETE(
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
) {
    const { id } = await ctx.params;
    const districtId = Number(id);

    if (!Number.isFinite(districtId)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await deleteDistrict(districtId);
    return NextResponse.json({ deleted: true });
}
