"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Trophy,
  CheckCircle2,
  Search,
  Loader2,
  ArrowRight,
  Sparkles,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";

type DistrictRow = {
  id: number;
  name: string;
  city: string;
  state: string;
  status: string;
  current_step: string | null;
  contact_count: number;
  club_count: number;
  known_club_count: number;
};

type Stats = {
  districts: number;
  contacts: number;
  clubs_in_districts: number;
  customer_matches: number;
  known_size: number;
};

export default function Home() {
  const [district, setDistrict] = useState("Georgetown Independent School District");
  const [city, setCity] = useState("Georgetown");
  const [state, setState] = useState("Texas");
  const [submitting, setSubmitting] = useState(false);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const deleteDistrictRow = async (d: DistrictRow) => {
    if (!confirm(`Remove ${d.name}? This deletes its contacts, clubs links, and event history.`)) {
      return;
    }
    setDeletingIds((prev) => new Set(prev).add(d.id));
    try {
      const res = await fetch(`/api/districts/${d.id}`, { method: "DELETE" });
      if (res.ok) {
        setDistricts((prev) => prev.filter((row) => row.id !== d.id));
      }
      await refresh();
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(d.id);
        return next;
      });
    }
  };

  const restartDistrict = async (d: DistrictRow) => {
    setRefreshingIds((prev) => new Set(prev).add(d.id));
    try {
      await fetch("/api/research", {
        method: "POST",
        body: JSON.stringify({ district_name: d.name, city: d.city, state: d.state }),
      });
      await refresh();
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(d.id);
        return next;
      });
    }
  };

  async function refresh() {
    const [a, b] = await Promise.all([
      fetch("/api/districts", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/stats", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setDistricts(a.districts ?? []);
    setStats(b);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return districts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q)
      );
    });
  }, [districts, query, statusFilter]);

  const submit = async () => {
    if (!district || !city || !state) return;
    setSubmitting(true);
    try {
      await fetch("/api/research", {
        method: "POST",
        body: JSON.stringify({ district_name: district, city, state }),
      });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sales Intelligence</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Research a district, surface decision-makers, and see which booster clubs you
          already work with — in one workflow.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Districts researched"
          value={stats?.districts ?? 0}
          icon={<Building2 className="size-5" />}
          tint="navy"
        />
        <Kpi
          label="Contacts found"
          value={stats?.contacts ?? 0}
          icon={<Users className="size-5" />}
          tint="sky"
        />
        <Kpi
          label="Booster clubs identified"
          value={stats?.clubs_in_districts ?? 0}
          icon={<Trophy className="size-5" />}
          tint="amber"
        />
        <Kpi
          label="Customer matches"
          value={stats?.customer_matches ?? 0}
          sub={`of ${stats?.known_size ?? 0} known customers`}
          icon={<CheckCircle2 className="size-5" />}
          tint="lime"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4 text-blue-900" />
              <h2 className="font-medium">Research a new district</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Kicks off a durable workflow: contacts → enrichment → booster clubs → customer match.
            </p>
            <div className="space-y-3">
              <Field label="District name">
                <input
                  className="input"
                  placeholder="Georgetown Independent School District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input
                    className="input"
                    placeholder="Georgetown"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </Field>
                <Field label="State">
                  <input
                    className="input"
                    placeholder="Texas"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </Field>
              </div>
              <button
                onClick={submit}
                disabled={submitting || !district || !city || !state}
                className="btn-primary w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Starting workflow…
                  </>
                ) : (
                  <>
                    Research district <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </Card>

          <div className="mt-4 text-xs text-slate-500 leading-relaxed px-1">
            <span className="font-medium text-slate-700">Try:</span>{" "}
            <QuickFill
              onClick={() =>
                setQuickFill("Frisco Independent School District", "Frisco", "Texas")
              }
            >
              Frisco ISD
            </QuickFill>
            ,{" "}
            <QuickFill
              onClick={() =>
                setQuickFill("Austin Independent School District", "Austin", "Texas")
              }
            >
              Austin ISD
            </QuickFill>
            ,{" "}
            <QuickFill
              onClick={() =>
                setQuickFill("Plano Independent School District", "Plano", "Texas")
              }
            >
              Plano ISD
            </QuickFill>
          </div>
        </section>

        <section className="lg:col-span-2">
          <Card noPadding>
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3">
              <h2 className="font-medium mr-auto">Districts</h2>
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Search by name, city, or state"
                width="w-72"
              />
              <select
                className="input py-1.5 text-sm w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="researching">Researching</option>
                <option value="complete">Complete</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                {districts.length === 0
                  ? "No districts researched yet. Start one with the form on the left."
                  : "No districts match your filter."}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const isRefreshing = refreshingIds.has(d.id);
                  const isDeleting = deletingIds.has(d.id);
                  const isBusy = isRefreshing || d.status === "researching" || d.status === "pending";
                  return (
                    <li key={d.id} className="flex items-stretch hover:bg-slate-50 transition">
                      <Link
                        href={`/districts/${d.id}`}
                        className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0"
                      >
                        <StatusDot status={d.status} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 truncate">{d.name}</div>
                          <div className="text-xs text-slate-500">
                            {d.city}, {d.state}
                            {d.status === "researching" && d.current_step && (
                              <span className="ml-2 text-blue-900">· {d.current_step}</span>
                            )}
                          </div>
                        </div>
                        <Metric value={d.contact_count} label="contacts" />
                        <Metric value={d.club_count} label="clubs" />
                        <Metric
                          value={d.known_club_count}
                          label="customers"
                          emphasized={d.known_club_count > 0}
                        />
                      </Link>
                      <div className="flex items-center gap-1 pr-3">
                        <button
                          type="button"
                          onClick={() => restartDistrict(d)}
                          disabled={isBusy || isDeleting}
                          title={
                            isBusy
                              ? "Workflow already running"
                              : "Re-run research workflow"
                          }
                          aria-label={`Re-run research for ${d.name}`}
                          className="size-8 grid place-items-center rounded-md text-slate-400 hover:text-blue-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed transition"
                        >
                          {isRefreshing ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCw className="size-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDistrictRow(d)}
                          disabled={isDeleting || isRefreshing}
                          title="Remove district"
                          aria-label={`Remove ${d.name}`}
                          className="size-8 grid place-items-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed transition"
                        >
                          {isDeleting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                        <ArrowRight className="size-4 text-slate-300 shrink-0" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <p className="text-xs text-slate-400 mt-2 text-right">Auto-refreshing every 3s</p>
        </section>
      </div>
    </div>
  );

  function setQuickFill(d: string, c: string, s: string) {
    setDistrict(d);
    setCity(c);
    setState(s);
  }
}

function SearchBox({
  value,
  onChange,
  placeholder,
  width = "w-full",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}) {
  return (
    <div className={`search ${width}`}>
      <Search />
      <input
        type="text"
        className="input"
        placeholder={placeholder ?? "Search"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        aria-label="Clear search"
        className="search-clear"
        onClick={() => onChange("")}
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function QuickFill({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="underline decoration-slate-300 hover:decoration-slate-700 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function Card({
  children,
  noPadding,
}: {
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm ${
        noPadding ? "" : "p-5"
      }`}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon,
  tint,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  tint: "navy" | "sky" | "amber" | "lime";
}) {
  const tints: Record<string, string> = {
    navy: "bg-blue-50 text-blue-900",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    lime: "bg-lime-50 text-lime-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
      <div className={`size-10 rounded-lg grid place-items-center ${tints[tint]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500 truncate">{label}</div>
        <div className="text-xl font-semibold tracking-tight tabular-nums">
          {value.toLocaleString()}
        </div>
        {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; pulse: boolean; label: string }> = {
    pending: { color: "bg-slate-400", pulse: true, label: "Pending" },
    researching: { color: "bg-blue-700", pulse: true, label: "Researching" },
    complete: { color: "bg-lime-600", pulse: false, label: "Complete" },
    failed: { color: "bg-rose-500", pulse: false, label: "Failed" },
  };
  const s = map[status] ?? { color: "bg-slate-300", pulse: false, label: status };
  return (
    <span className="relative inline-flex size-2.5 shrink-0" title={s.label}>
      <span
        className={`absolute inset-0 rounded-full ${s.color} ${
          s.pulse ? "status-dot-pulse" : ""
        }`}
      />
    </span>
  );
}

function Metric({
  value,
  label,
  emphasized,
}: {
  value: number;
  label: string;
  emphasized?: boolean;
}) {
  return (
    <div className="text-right hidden sm:block min-w-[60px]">
      <div
        className={`text-sm font-semibold tabular-nums ${
          emphasized ? "text-lime-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
