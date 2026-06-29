"use client";

import { useMemo, useState } from "react";
import Globe from "./map/Globe";
import Controls from "./map/Controls";
import LayerToggles from "./map/LayerToggles";
import RecordDrawer from "./map/RecordDrawer";
import Footer from "./layout/Footer";
import { applyFilters, EMPTY_FILTERS, type Filters } from "../lib/atlas/filters";
import type { MapRecord } from "../lib/atlas/schema";

type Summary = {
  totalRecords: number;
  uniqueAgencies: number;
  uniqueStates: number;
  technologies: string[];
  states: string[];
};

export default function MapExperience({
  records,
  summary,
}: {
  records: MapRecord[];
  summary: Summary;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  // A single selected record, or a list of co-located records (stacked on one centroid).
  const [selected, setSelected] = useState<MapRecord[] | null>(null);
  // Toggle the additional open-data cross-reference layers (off by default so the
  // EFF Atlas stays the primary view).
  const [showOsm, setShowOsm] = useState(false);
  const [showWikidata, setShowWikidata] = useState(false);

  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-space">
      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 p-4">
        <div className="pointer-events-auto flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight text-signal">◓ Surveillance Radar</span>
          <span className="hidden text-xs text-[#7d8ba0] sm:inline">
            Documented law-enforcement surveillance technology · Data from EFF Atlas of Surveillance
          </span>
        </div>
        <div className="pointer-events-auto text-right text-xs text-[#7d8ba0]">
          <div>
            <span className="text-[#dbe6f2]">{filtered.length.toLocaleString()}</span> of{" "}
            {summary.totalRecords.toLocaleString()} records
          </div>
          <div>
            {summary.uniqueAgencies.toLocaleString()} agencies · {summary.uniqueStates} states
          </div>
        </div>
      </header>

      {/* The globe */}
      <Globe records={filtered} onSelect={setSelected} showOsm={showOsm} showWikidata={showWikidata} />

      {/* Floating controls */}
      <Controls
        filters={filters}
        onChange={setFilters}
        states={summary.states}
        technologies={summary.technologies}
      />

      {/* Cross-reference open-data layer toggles */}
      <LayerToggles
        showOsm={showOsm}
        showWikidata={showWikidata}
        onToggleOsm={() => setShowOsm((v) => !v)}
        onToggleWikidata={() => setShowWikidata((v) => !v)}
      />

      {/* Detail drawer */}
      <RecordDrawer records={selected} onClose={() => setSelected(null)} />

      <Footer />
    </main>
  );
}
