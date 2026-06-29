"use client";

import type { Filters } from "../../lib/atlas/filters";

export default function Controls({
  filters,
  onChange,
  states,
  technologies,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  states: string[];
  technologies: string[];
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="absolute left-4 top-20 z-20 w-64 rounded-xl border border-edge bg-panel/80 p-4 backdrop-blur">
      <input
        type="search"
        value={filters.query}
        onChange={(e) => set({ query: e.target.value })}
        placeholder="Search city, agency, tech…"
        className="w-full rounded-md border border-edge bg-space/70 px-3 py-2 text-sm text-[#dbe6f2] placeholder:text-[#5b6a80] focus:border-signal focus:outline-none"
      />

      <label className="mt-3 block text-[11px] uppercase tracking-wide text-[#7d8ba0]">State</label>
      <select
        value={filters.state ?? ""}
        onChange={(e) => set({ state: e.target.value || null })}
        className="mt-1 w-full rounded-md border border-edge bg-space/70 px-2 py-1.5 text-sm text-[#dbe6f2] focus:border-signal focus:outline-none"
      >
        <option value="">All states</option>
        {states.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <label className="mt-3 block text-[11px] uppercase tracking-wide text-[#7d8ba0]">Technology</label>
      <select
        value={filters.technology ?? ""}
        onChange={(e) => set({ technology: e.target.value || null })}
        className="mt-1 w-full rounded-md border border-edge bg-space/70 px-2 py-1.5 text-sm text-[#dbe6f2] focus:border-signal focus:outline-none"
      >
        <option value="">All technologies</option>
        {technologies.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <label className="mt-3 flex items-center gap-2 text-xs text-[#9fb0c6]">
        <input
          type="checkbox"
          checked={filters.sourcesOnly}
          onChange={(e) => set({ sourcesOnly: e.target.checked })}
          className="accent-signal"
        />
        Only records with source links
      </label>

      {(filters.query || filters.state || filters.technology || filters.sourcesOnly) && (
        <button
          onClick={() => onChange({ query: "", state: null, technology: null, sourcesOnly: false })}
          className="mt-3 text-xs text-[#7d8ba0] underline-offset-2 hover:text-signal hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
