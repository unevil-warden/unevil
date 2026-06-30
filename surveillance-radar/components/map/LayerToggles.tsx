"use client";

import { THEME } from "../../lib/atlas/theme";

// Toggle panel for the additional open-data cross-reference layers. Each row
// shows the layer's distinct marker color and its required attribution so the
// credit is visible wherever the layer can be turned on.
export default function LayerToggles({
  showOsm,
  showWikidata,
  onToggleOsm,
  onToggleWikidata,
}: {
  showOsm: boolean;
  showWikidata: boolean;
  onToggleOsm: () => void;
  onToggleWikidata: () => void;
}) {
  return (
    <div className="absolute right-4 top-20 z-20 w-60 rounded-xl border border-edge bg-panel/80 p-4 backdrop-blur">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-[#7d8ba0]">Cross-reference layers</div>

      <LayerRow
        on={showOsm}
        onToggle={onToggleOsm}
        color={THEME.osm}
        title="OSM surveillance"
        attribution="© OpenStreetMap contributors (ODbL)"
      />
      <LayerRow
        on={showWikidata}
        onToggle={onToggleWikidata}
        color={THEME.wikidata}
        title="Wikidata agencies"
        attribution="Wikidata (CC0)"
      />

      <p className="mt-2 text-[10px] leading-relaxed text-[#5b6a80]">
        Open data layered alongside the EFF Atlas for cross-reference. Separate sources; not part of
        the Atlas dataset.
      </p>
    </div>
  );
}

function LayerRow({
  on,
  onToggle,
  color,
  title,
  attribution,
}: {
  on: boolean;
  onToggle: () => void;
  color: string;
  title: string;
  attribution: string;
}) {
  return (
    <label className="mt-1 flex cursor-pointer items-start gap-2 py-1 text-xs text-[#9fb0c6]">
      <input type="checkbox" checked={on} onChange={onToggle} className="mt-0.5 accent-signal" />
      <span className="flex-1">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[#dbe6f2]">{title}</span>
        </span>
        <span className="block text-[10px] text-[#5b6a80]">{attribution}</span>
      </span>
    </label>
  );
}
