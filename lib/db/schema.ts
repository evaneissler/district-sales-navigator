import { sql } from "@vercel/postgres";

let ensured: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!ensured) ensured = run();
  return ensured;
}

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS districts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      website TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      current_step TEXT,
      workflow_run_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(name, city, state)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      linkedin_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS contacts_district_idx ON contacts(district_id);`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS contacts_district_email_idx ON contacts(district_id, email) WHERE email IS NOT NULL;`;
  await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_source_url TEXT;`;
  await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_source_url TEXT;`;

  await sql`
    CREATE TABLE IF NOT EXISTS booster_clubs (
      ein TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      officer TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      address TEXT,
      ntee_code TEXT,
      website_url TEXT,
      facebook_url TEXT,
      linkedin_url TEXT,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS booster_clubs_state_city_idx ON booster_clubs(state, city);`;
  // For an existing table from earlier seed, add missing columns idempotently.
  await sql`ALTER TABLE booster_clubs ADD COLUMN IF NOT EXISTS officer TEXT;`;
  await sql`ALTER TABLE booster_clubs ADD COLUMN IF NOT EXISTS zip TEXT;`;
  await sql`ALTER TABLE booster_clubs ADD COLUMN IF NOT EXISTS website_url TEXT;`;
  await sql`ALTER TABLE booster_clubs ADD COLUMN IF NOT EXISTS facebook_url TEXT;`;
  await sql`ALTER TABLE booster_clubs ADD COLUMN IF NOT EXISTS linkedin_url TEXT;`;
  await sql`ALTER TABLE booster_clubs ADD COLUMN IF NOT EXISTS email TEXT;`;

  await sql`
    CREATE TABLE IF NOT EXISTS district_clubs (
      id SERIAL PRIMARY KEY,
      district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
      ein TEXT NOT NULL REFERENCES booster_clubs(ein),
      confidence REAL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(district_id, ein)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS district_events (
      id SERIAL PRIMARY KEY,
      district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
      step TEXT NOT NULL,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS district_events_district_idx ON district_events(district_id, id);`;
}
