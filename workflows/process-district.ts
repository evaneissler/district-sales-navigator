import { storeDistrictInDatabase } from "./steps/database";
import { enrichContacts } from "./steps/enrich-contacts";
import { findContacts } from "./steps/find-contacts";
import { findExistingCustomers } from "./steps/find-existing-customers";
import { generateCustomEmail } from "./steps/generate-email";
import { District } from "./types";

export async function handleNewDistrict(name: string, city: string, state: string) {
    "use workflow";
    
    const district: District = {
        name: name,
        city: city,
        state: state,
    };

    //await storeDistrictInDatabase(district);

    await findContacts(district);

    //await enrichContacts(district);

    //await findExistingCustomers(district);

    //await generateCustomEmail(district);

    return { district: district.name, status: "onboarded" };
}