import { storeDistrictInDatabase } from "./steps/database";
import { enrichContacts } from "./steps/enrich-contacts";
import { findContacts } from "./steps/find-contacts";
import { findBoosterClubs } from "./steps/find-booster-clubs";
import { markComplete, markFailed } from "./steps/finalize";
import { District } from "./types";

export type RerunStep = "find-contacts" | "enrich-contacts" | "find-booster-clubs";

export async function handleNewDistrict(name: string, city: string, state: string) {
    "use workflow";

    const district = await storeDistrictInDatabase({ name, city, state });

    try {
        await findContacts(district);
        await enrichContacts(district);
        await findBoosterClubs(district);
        await markComplete(district.id);
    } catch (err) {
        await markFailed(district.id, String(err));
        throw err;
    }

    return { districtId: district.id, status: "complete" };
}

export async function rerunDistrictStep(district: District, step: RerunStep) {
    "use workflow";

    try {
        if (step === "find-contacts") {
            await findContacts(district);
        } else if (step === "enrich-contacts") {
            await enrichContacts(district);
        } else if (step === "find-booster-clubs") {
            await findBoosterClubs(district);
        }
        await markComplete(district.id);
    } catch (err) {
        await markFailed(district.id, String(err));
        throw err;
    }

    return { districtId: district.id, status: "complete", step };
}
