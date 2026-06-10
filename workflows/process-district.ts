import { storeDistrictInDatabase } from "./steps/database";
import { enrichContacts } from "./steps/enrich-contacts";
import { findContacts } from "./steps/find-contacts";
import { findBoosterClubs } from "./steps/find-booster-clubs";
import { markComplete, markFailed } from "./steps/finalize";

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
