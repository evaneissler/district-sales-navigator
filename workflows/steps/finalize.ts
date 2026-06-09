import { logDistrictEvent, updateDistrictStatus } from "@/lib/db/queries";

export async function markComplete(districtId: number) {
    "use step";
    await updateDistrictStatus(districtId, "complete", null);
    await logDistrictEvent(districtId, "finalize", "done", "Workflow complete");
}

export async function markFailed(districtId: number, reason: string) {
    "use step";
    await updateDistrictStatus(districtId, "failed", `error: ${reason.slice(0, 200)}`);
    await logDistrictEvent(
        districtId,
        "finalize",
        "error",
        `Failed: ${reason.slice(0, 200)}`,
    );
}
