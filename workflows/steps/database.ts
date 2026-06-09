import {
    logDistrictEvent,
    updateDistrictStatus,
    upsertDistrict,
} from "@/lib/db/queries";

export async function storeDistrictInDatabase(input: {
    name: string;
    city: string;
    state: string;
}): Promise<{ id: number; name: string; city: string; state: string }> {
    "use step";

    const id = await upsertDistrict(input.name, input.city, input.state);
    await updateDistrictStatus(id, "pending", "store-district");
    await logDistrictEvent(
        id,
        "store-district",
        "start",
        `Queued ${input.name} (${input.city}, ${input.state})`,
    );

    return { id, name: input.name, city: input.city, state: input.state };
}
