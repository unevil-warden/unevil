"use client";

import { useState } from "react";

export default function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-lg border border-edge bg-panel/80 px-4 py-2 text-center text-[11px] leading-relaxed text-[#7d8ba0] backdrop-blur">
        <span className="text-[#9fb0c6]">Data sources: EFF Atlas of Surveillance</span>{" "}
        · optional cross-reference layers from{" "}
        <span className="text-[#9fb0c6]">© OpenStreetMap contributors (ODbL)</span> and{" "}
        <span className="text-[#9fb0c6]">Wikidata (CC0)</span>.{" "}
        Absence of a marker does not mean absence of surveillance — an area may simply not have been
        researched yet.{" "}
        <button onClick={() => setOpen((o) => !o)} className="text-signal hover:underline">
          {open ? "less" : "more"}
        </button>
        {open && (
          <p className="mt-2 text-[#7d8ba0]">
            This app visualizes public records from the EFF Atlas of Surveillance. Missing records do
            not prove that a location has no surveillance technology; they may only mean the area has
            not been researched or the data has not been updated. This project is an independent
            visualization and is not affiliated with or endorsed by EFF unless explicitly stated. The
            Atlas dataset is published by the Electronic Frontier Foundation under its CC BY terms.
            The optional cross-reference layers are independent open datasets: surveillance/CCTV
            nodes from OpenStreetMap (© OpenStreetMap contributors, ODbL) and law-enforcement agency
            metadata from Wikidata (CC0). They are baked to static files at build time and are not
            part of, nor endorsed by, the EFF Atlas.
          </p>
        )}
      </div>
    </footer>
  );
}
