"use client";

import type { MapRecord } from "../../lib/atlas/schema";

function locationLine(r: MapRecord): string {
  return [r.city, r.county ? `${r.county} County` : null, r.state].filter(Boolean).join(", ");
}

function RecordBody({ r }: { r: MapRecord }) {
  return (
    <div className="border-t border-edge pt-4">
      <h3 className="text-base font-semibold text-signal">{r.technology ?? "Surveillance record"}</h3>
      <dl className="mt-2 space-y-1 text-sm">
        {r.agencyName && (
          <div>
            <dt className="inline text-[#7d8ba0]">Agency: </dt>
            <dd className="inline text-[#dbe6f2]">{r.agencyName}</dd>
          </div>
        )}
        <div>
          <dt className="inline text-[#7d8ba0]">Location: </dt>
          <dd className="inline text-[#dbe6f2]">{locationLine(r) || "—"}</dd>
        </div>
        {r.vendor && (
          <div>
            <dt className="inline text-[#7d8ba0]">Vendor: </dt>
            <dd className="inline text-[#dbe6f2]">{r.vendor}</dd>
          </div>
        )}
      </dl>

      {r.description && <p className="mt-3 text-sm leading-relaxed text-[#aeb9c9]">{r.description}</p>}

      {r.sourceUrls.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wide text-[#7d8ba0]">Evidence links</div>
          <ul className="mt-1 space-y-1">
            {r.sourceUrls.map((u, i) => (
              <li key={u}>
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-signal underline-offset-2 hover:underline break-all"
                >
                  🔗 Source {i + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.geocodeSource && r.geocodeSource !== "csv" && r.geocodeSource !== "city" && (
        <p className="mt-3 text-[11px] text-[#5b6a80]">
          Location approximated to {r.geocodeSource} centroid (no precise coordinates in source data).
        </p>
      )}
    </div>
  );
}

export default function RecordDrawer({
  records,
  onClose,
}: {
  records: MapRecord[] | null;
  onClose: () => void;
}) {
  if (!records || records.length === 0) return null;

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-full max-w-sm flex-col border-l border-edge bg-panel/95 backdrop-blur">
      <div className="flex items-center justify-between p-4">
        <span className="text-xs uppercase tracking-wide text-[#7d8ba0]">
          {records.length > 1 ? `${records.length} records here` : "Surveillance record"}
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded px-2 text-lg text-[#7d8ba0] hover:text-signal"
        >
          ✕
        </button>
      </div>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        {records.map((r) => (
          <RecordBody key={r.id} r={r} />
        ))}
      </div>

      <div className="border-t border-edge p-4 text-[11px] text-[#7d8ba0]">
        Data from EFF Atlas of Surveillance. Independent visualization; not affiliated with or
        endorsed by EFF.
      </div>
    </aside>
  );
}
