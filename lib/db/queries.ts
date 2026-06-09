import { sql } from "@vercel/postgres";
import { ensureSchema } from "./schema";
import { getKnownEins } from "@/lib/known-eins";

export type DistrictRow = {
  id: number;
  name: string;
  city: string;
  state: string;
  website: string | null;
  status: string;
  current_step: string | null;
  created_at: string;
};

export type DistrictWithCounts = DistrictRow & {
  contact_count: number;
  club_count: number;
  known_club_count: number;
};

export type ContactRow = {
  id: number;
  district_id: number;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  email_source_url: string | null;
  phone_source_url: string | null;
};

export type ClubRow = {
  ein: string;
  name: string;
  officer: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  email: string | null;
  is_customer: boolean;
};

export async function upsertDistrict(name: string, city: string, state: string) {
  await ensureSchema();
  const { rows } = await sql<{ id: number }>`
    INSERT INTO districts (name, city, state)
    VALUES (${name}, ${city}, ${state})
    ON CONFLICT (name, city, state) DO UPDATE
      SET updated_at = now()
    RETURNING id;
  `;
  return rows[0].id;
}

export async function updateDistrictStatus(
  districtId: number,
  status: string,
  currentStep?: string | null,
) {
  await ensureSchema();
  await sql`
    UPDATE districts
    SET status = ${status},
        current_step = ${currentStep ?? null},
        updated_at = now()
    WHERE id = ${districtId};
  `;
}

export async function setDistrictWebsite(districtId: number, website: string) {
  await ensureSchema();
  await sql`UPDATE districts SET website = ${website}, updated_at = now() WHERE id = ${districtId};`;
}

export async function insertContact(c: {
  districtId: number;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  emailSourceUrl?: string;
  phoneSourceUrl?: string;
}) {
  await ensureSchema();
  const { rows } = await sql<{ id: number }>`
    INSERT INTO contacts (district_id, name, title, email, phone, linkedin_url, email_source_url, phone_source_url)
    VALUES (
      ${c.districtId},
      ${c.name},
      ${c.title ?? null},
      ${c.email ?? null},
      ${c.phone ?? null},
      ${c.linkedinUrl ?? null},
      ${c.emailSourceUrl ?? null},
      ${c.phoneSourceUrl ?? null}
    )
    ON CONFLICT (district_id, email) WHERE email IS NOT NULL DO UPDATE
      SET title = COALESCE(EXCLUDED.title, contacts.title),
          phone = COALESCE(EXCLUDED.phone, contacts.phone),
          linkedin_url = COALESCE(EXCLUDED.linkedin_url, contacts.linkedin_url),
          email_source_url = COALESCE(EXCLUDED.email_source_url, contacts.email_source_url),
          phone_source_url = COALESCE(EXCLUDED.phone_source_url, contacts.phone_source_url)
    RETURNING id;
  `;
  return rows[0]?.id;
}

export async function updateContactEnrichment(
  contactId: number,
  patch: {
    phone?: string | null;
    linkedinUrl?: string | null;
    phoneSourceUrl?: string | null;
  },
) {
  await ensureSchema();
  await sql`
    UPDATE contacts
    SET phone = COALESCE(${patch.phone ?? null}, phone),
        linkedin_url = COALESCE(${patch.linkedinUrl ?? null}, linkedin_url),
        phone_source_url = COALESCE(${patch.phoneSourceUrl ?? null}, phone_source_url)
    WHERE id = ${contactId};
  `;
}

export async function listContactsForDistrict(districtId: number) {
  await ensureSchema();
  const { rows } = await sql<ContactRow>`
    SELECT id, district_id, name, title, email, phone, linkedin_url, email_source_url, phone_source_url
    FROM contacts
    WHERE district_id = ${districtId}
    ORDER BY id ASC;
  `;
  return rows;
}

export async function upsertBoosterClub(c: {
  ein: string;
  name: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  nteeCode?: string | null;
}) {
  await ensureSchema();
  await sql`
    INSERT INTO booster_clubs (ein, name, city, state, zip, ntee_code)
    VALUES (${c.ein}, ${c.name}, ${c.city ?? null}, ${c.state ?? null}, ${c.zip ?? null}, ${c.nteeCode ?? null})
    ON CONFLICT (ein) DO UPDATE SET
      name = EXCLUDED.name,
      city = COALESCE(EXCLUDED.city, booster_clubs.city),
      state = COALESCE(EXCLUDED.state, booster_clubs.state),
      zip = COALESCE(EXCLUDED.zip, booster_clubs.zip),
      ntee_code = COALESCE(EXCLUDED.ntee_code, booster_clubs.ntee_code);
  `;
}

export async function linkClubToDistrict(districtId: number, ein: string, confidence: number) {
  await ensureSchema();
  await sql`
    INSERT INTO district_clubs (district_id, ein, confidence)
    VALUES (${districtId}, ${ein}, ${confidence})
    ON CONFLICT (district_id, ein) DO UPDATE SET confidence = EXCLUDED.confidence;
  `;
}

export async function listClubsForDistrict(districtId: number): Promise<ClubRow[]> {
  await ensureSchema();
  const knownEins = await getKnownEins();
  const { rows } = await sql<Omit<ClubRow, "is_customer">>`
    SELECT
      bc.ein,
      bc.name,
      bc.officer,
      bc.city,
      bc.state,
      bc.zip,
      bc.website_url,
      bc.facebook_url,
      bc.linkedin_url,
      bc.email
    FROM district_clubs dc
    JOIN booster_clubs bc ON bc.ein = dc.ein
    WHERE dc.district_id = ${districtId}
    ORDER BY bc.name ASC;
  `;
  const enriched: ClubRow[] = rows.map((r) => ({ ...r, is_customer: knownEins.has(r.ein) }));
  enriched.sort((a, b) => Number(b.is_customer) - Number(a.is_customer) || a.name.localeCompare(b.name));
  return enriched;
}

export async function listDistricts(): Promise<DistrictWithCounts[]> {
  await ensureSchema();
  const knownEins = await getKnownEins();
  const { rows } = await sql<Omit<DistrictWithCounts, "known_club_count">>`
    SELECT
      d.id, d.name, d.city, d.state, d.website, d.status, d.current_step, d.created_at,
      (SELECT COUNT(*)::int FROM contacts c WHERE c.district_id = d.id) AS contact_count,
      (SELECT COUNT(*)::int FROM district_clubs dc WHERE dc.district_id = d.id) AS club_count
    FROM districts d
    ORDER BY d.created_at DESC;
  `;

  if (knownEins.size === 0) {
    return rows.map((r) => ({ ...r, known_club_count: 0 }));
  }

  const { rows: links } = await sql<{ district_id: number; ein: string }>`
    SELECT district_id, ein FROM district_clubs;
  `;
  const counts = new Map<number, number>();
  for (const l of links) {
    if (knownEins.has(l.ein)) counts.set(l.district_id, (counts.get(l.district_id) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, known_club_count: counts.get(r.id) ?? 0 }));
}

export type DistrictEventRow = {
  id: number;
  district_id: number;
  step: string;
  kind: string;
  message: string;
  created_at: string;
};

export async function logDistrictEvent(
  districtId: number,
  step: string,
  kind: string,
  message: string,
) {
  await ensureSchema();
  await sql`
    INSERT INTO district_events (district_id, step, kind, message)
    VALUES (${districtId}, ${step}, ${kind}, ${message});
  `;
}

export async function listDistrictEvents(
  districtId: number,
  limit = 200,
): Promise<DistrictEventRow[]> {
  await ensureSchema();
  const { rows } = await sql<DistrictEventRow>`
    SELECT id, district_id, step, kind, message, created_at
    FROM district_events
    WHERE district_id = ${districtId}
    ORDER BY id DESC
    LIMIT ${limit};
  `;
  return rows.reverse();
}

export async function deleteDistrict(id: number) {
  await ensureSchema();
  await sql`DELETE FROM districts WHERE id = ${id};`;
}

export async function getDistrict(id: number): Promise<DistrictRow | null> {
  await ensureSchema();
  const { rows } = await sql<DistrictRow>`
    SELECT id, name, city, state, website, status, current_step, created_at
    FROM districts WHERE id = ${id};
  `;
  return rows[0] ?? null;
}
