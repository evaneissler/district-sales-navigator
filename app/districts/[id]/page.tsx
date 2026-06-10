"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  Link2,
  Share2,
  CheckCircle2,
  Users,
  Trophy,
  Building2,
  ExternalLink,
  Search,
  X,
  Activity,
  RefreshCw,
  Loader2,
  UserSearch,
  Sparkles,
} from "lucide-react";

type District = {
  id: number;
  name: string;
  city: string;
  state: string;
  website: string | null;
  status: string;
  current_step: string | null;
};

type Contact = {
  id: number;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  email_source_url: string | null;
  phone_source_url: string | null;
};

type DistrictEvent = {
  id: number;
  step: string;
  kind: string;
  message: string;
  created_at: string;
};

type Club = {
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

export default function DistrictDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [district, setDistrict] = useState<District | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<DistrictEvent[]>([]);
  const [tab, setTab] = useState<"contacts" | "clubs">("clubs");
  const [clubQuery, setClubQuery] = useState("");
  const [onlyCustomers, setOnlyCustomers] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const res = await fetch(`/api/districts/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (!mounted) return;
      setDistrict(data.district);
      setContacts(data.contacts);
      setClubs(data.clubs);
      setEvents(data.events ?? []);
    }
    load();
    const t = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [id]);

  const filteredClubs = useMemo(() => {
    const q = clubQuery.trim().toLowerCase();
    return clubs.filter((c) => {
      if (onlyCustomers && !c.is_customer) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.ein.includes(q) ||
        (c.officer?.toLowerCase().includes(q) ?? false) ||
        (c.city?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clubs, clubQuery, onlyCustomers]);

  if (!district) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="mt-12 text-center text-slate-400">Loading…</div>
      </div>
    );
  }

  const customerCount = clubs.filter((c) => c.is_customer).length;
  const customerPct = clubs.length > 0 ? Math.round((customerCount / clubs.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="size-4" /> All districts
      </Link>

      {/* Hero */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="size-12 rounded-lg bg-blue-50 text-blue-900 grid place-items-center shrink-0">
            <Building2 className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{district.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
              <span>
                {district.city}, {district.state}
              </span>
              {district.website && (
                <a
                  href={district.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-900 hover:underline"
                >
                  <Globe className="size-3.5" /> Website <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
          <StatusPill status={district.status} step={district.current_step} />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 border-t border-slate-100 pt-5">
          <Stat icon={<Users className="size-4" />} label="Contacts" value={contacts.length} />
          <Stat icon={<Trophy className="size-4" />} label="Booster clubs" value={clubs.length} />
          <Stat
            icon={<CheckCircle2 className="size-4" />}
            label={`Customers (${customerPct}%)`}
            value={customerCount}
            tint="lime"
          />
        </div>
      </section>

      <ProgressPanel events={events} status={district.status} />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <TabButton active={tab === "clubs"} onClick={() => setTab("clubs")}>
          Booster clubs ({clubs.length})
        </TabButton>
        <TabButton active={tab === "contacts"} onClick={() => setTab("contacts")}>
          Contacts ({contacts.length})
        </TabButton>
      </div>

      {tab === "clubs" && (
        <section>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="search flex-1 min-w-[240px]">
              <Search />
              <input
                type="text"
                className="input"
                placeholder="Filter by name, EIN, officer, city"
                value={clubQuery}
                onChange={(e) => setClubQuery(e.target.value)}
              />
              <button
                type="button"
                aria-label="Clear search"
                className="search-clear"
                onClick={() => setClubQuery("")}
              >
                <X className="size-3" strokeWidth={2.5} />
              </button>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                type="checkbox"
                className="accent-blue-900 size-4"
                checked={onlyCustomers}
                onChange={(e) => setOnlyCustomers(e.target.checked)}
              />
              Customers only
            </label>
          </div>

          {filteredClubs.length === 0 ? (
            <EmptyState
              title={clubs.length === 0 ? "No booster clubs matched yet" : "No clubs match your filter"}
              sub={clubs.length === 0 ? "The workflow may still be running." : undefined}
            />
          ) : (
            <div className="grid gap-2">
              {filteredClubs.map((c) => (
                <ClubRow key={c.ein} club={c} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "contacts" && (
        <section>
          {contacts.length === 0 ? (
            <EmptyState title="No contacts found yet" sub="The workflow may still be running." />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-left">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Title</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Phone</th>
                    <th className="px-4 py-2.5 font-medium">LinkedIn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 align-top">
                      <td className="px-4 py-2.5 font-medium">{c.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.title ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {c.email ? (
                          <div className="flex flex-col gap-0.5">
                            <a
                              href={`mailto:${c.email}`}
                              className="text-blue-900 hover:underline inline-flex items-center gap-1"
                            >
                              <Mail className="size-3" /> {c.email}
                            </a>
                            <SourceLink url={c.email_source_url} />
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.phone ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              <Phone className="size-3" /> {c.phone}
                            </span>
                            <SourceLink url={c.phone_source_url} />
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.linkedin_url ? (
                          <a
                            href={c.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-900 hover:underline inline-flex items-center gap-1"
                          >
                            <Link2 className="size-3" /> LinkedIn
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function StatusPill({ status, step }: { status: string; step: string | null }) {
  const map: Record<string, { bg: string; text: string; dot: string; label: string; pulse: boolean }> = {
    pending:     { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-500", label: "Pending",     pulse: true  },
    researching: { bg: "bg-blue-50",   text: "text-blue-900",  dot: "bg-blue-700",  label: "Researching", pulse: true  },
    complete:    { bg: "bg-lime-50",   text: "text-lime-800",  dot: "bg-lime-600",  label: "Complete",    pulse: false },
    failed:      { bg: "bg-rose-50",   text: "text-rose-700",  dot: "bg-rose-500",  label: "Failed",      pulse: false },
  };
  const s = map[status] ?? { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", label: status, pulse: false };
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className="relative inline-flex size-2">
        <span className={`absolute inset-0 rounded-full ${s.dot} ${s.pulse ? "status-dot-pulse" : ""}`} />
      </span>
      {s.label}
      {step && s.pulse && <span className="text-slate-500 font-normal">· {step}</span>}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tint?: "lime";
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon} {label}
      </div>
      <div
        className={`text-2xl font-semibold tracking-tight tabular-nums mt-1 ${
          tint === "lime" ? "text-lime-700" : ""
        }`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
        active
          ? "text-blue-900 border-blue-900"
          : "text-slate-500 border-transparent hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function ProgressPanel({
  events,
  status,
}: {
  events: DistrictEvent[];
  status: string;
}) {
  if (events.length === 0 && status === "complete") return null;
  const live = status === "researching" || status === "pending";
  const recent = events.slice(-8).reverse();
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Activity className="size-4 text-blue-700" />
          Progress
        </div>
        {live && (
          <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 rounded-full bg-blue-600 status-dot-pulse" />
            </span>
            live
          </span>
        )}
      </div>
      {recent.length === 0 ? (
        <div className="text-sm text-slate-400">Waiting for the workflow to start…</div>
      ) : (
        <ol className="space-y-2">
          {recent.map((e) => (
            <li key={e.id} className="flex items-start gap-3 text-sm">
              <EventDot kind={e.kind} />
              <div className="min-w-0 flex-1">
                <div className="text-slate-800">{e.message}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {e.step} · {new Date(e.created_at).toLocaleTimeString()}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function SourceLink({ url }: { url: string | null }) {
  if (!url) return null;
  let label = url;
  try {
    label = new URL(url).host;
  } catch {}
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] text-slate-400 hover:text-slate-700 inline-flex items-center gap-0.5 max-w-[240px] truncate"
      title={url}
    >
      <Globe className="size-2.5 shrink-0" /> source: {label}
    </a>
  );
}

function EventDot({ kind }: { kind: string }) {
  const color =
    kind === "found" || kind === "done"
      ? "bg-lime-500"
      : kind === "error"
        ? "bg-rose-500"
        : kind === "start"
          ? "bg-blue-600"
          : "bg-slate-400";
  return (
    <span className="relative mt-1 inline-flex size-2 shrink-0">
      <span className={`absolute inset-0 rounded-full ${color}`} />
    </span>
  );
}

function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-xl py-12 text-center">
      <div className="text-sm text-slate-700 font-medium">{title}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function ClubRow({ club }: { club: Club }) {
  return (
    <div
      className={`bg-white border rounded-lg p-4 transition hover:shadow-sm ${
        club.is_customer ? "border-lime-300 bg-lime-50/40" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`size-9 rounded-md grid place-items-center shrink-0 ${
            club.is_customer ? "bg-lime-100 text-lime-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {club.is_customer ? <CheckCircle2 className="size-5" /> : <Trophy className="size-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-900">{club.name}</span>
            {club.is_customer && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-lime-800 bg-lime-100 px-1.5 py-0.5 rounded">
                Customer
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono">
            EIN {club.ein}
            {club.city && (
              <span className="font-sans"> · {club.city}, {club.state} {club.zip}</span>
            )}
          </div>
          {club.officer && (
            <div className="text-sm text-slate-700 mt-2">
              <span className="text-slate-400">Officer:</span>{" "}
              <span className="font-medium">{club.officer}</span>
            </div>
          )}

          {(club.website_url || club.facebook_url || club.linkedin_url || club.email) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {club.email && (
                <ContactChip
                  href={`mailto:${club.email}`}
                  icon={<Mail className="size-3" />}
                  label={club.email}
                />
              )}
              {club.website_url && (
                <ContactChip
                  href={club.website_url}
                  icon={<Globe className="size-3" />}
                  label="Website"
                  external
                />
              )}
              {club.facebook_url && (
                <ContactChip
                  href={club.facebook_url}
                  icon={<Share2 className="size-3" />}
                  label="Facebook"
                  external
                />
              )}
              {club.linkedin_url && (
                <ContactChip
                  href={club.linkedin_url}
                  icon={<Link2 className="size-3" />}
                  label="LinkedIn"
                  external
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactChip({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
    >
      {icon}
      {label}
    </a>
  );
}
