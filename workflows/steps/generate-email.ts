import { District } from "../types";

export async function generateCustomEmail(district: District) {
    "use step";
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`Contacts enriched for district: ${district.name}, ${district.city}, ${district.state}`);
}   