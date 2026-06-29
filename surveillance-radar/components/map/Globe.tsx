"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { THEME } from "../../lib/atlas/theme";
import type { MapRecord } from "../../lib/atlas/schema";

// Dark globe style using MapLibre's free, keyless demo vector tiles for land outlines.
function buildStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    projection: { type: "globe" },
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      // Land outlines rendered from a bundled GeoJSON — fully self-contained, no tile
      // server, no API keys. (maplibre falls back to local glyph rendering for labels.)
      land: { type: "geojson", data: "/world.geojson" },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": THEME.water } },
      {
        id: "land",
        type: "fill",
        source: "land",
        paint: { "fill-color": THEME.earth },
      },
      {
        id: "land-edge",
        type: "line",
        source: "land",
        paint: { "line-color": THEME.earthEdge, "line-width": 0.6 },
      },
    ],
  };
}

function toFeatureCollection(records: MapRecord[]) {
  return {
    type: "FeatureCollection" as const,
    features: records.map((r) => ({
      type: "Feature" as const,
      properties: { id: r.id, technology: r.technology ?? "", agency: r.agencyName ?? "" },
      geometry: { type: "Point" as const, coordinates: [r.longitude, r.latitude] },
    })),
  };
}

export default function Globe({
  records,
  onSelect,
}: {
  records: MapRecord[];
  onSelect: (records: MapRecord[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const recordsRef = useRef<MapRecord[]>(records);
  const spinRef = useRef(true);
  const [spinning, setSpinning] = useState(true);
  const [ready, setReady] = useState(false);

  recordsRef.current = records;

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      center: [-98, 39],
      zoom: 1.6,
      attributionControl: false,
      maxPitch: 0,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      // Soft blue atmosphere halo around the globe.
      try {
        map.setSky({
          "sky-color": THEME.atmosphere,
          "horizon-color": THEME.atmosphere,
          "fog-color": THEME.space,
          "sky-horizon-blend": 0.6,
          "horizon-fog-blend": 0.6,
          "fog-ground-blend": 0.2,
          "atmosphere-blend": 0.7,
        } as any);
      } catch {
        // setSky unsupported on this version — globe still renders fine.
      }

      map.addSource("records", {
        type: "geojson",
        data: toFeatureCollection(recordsRef.current),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 8,
      });

      // Cluster glow halo + core.
      map.addLayer({
        id: "cluster-glow",
        type: "circle",
        source: "records",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": THEME.cluster,
          "circle-blur": 1,
          "circle-opacity": 0.35,
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 26, 50, 36],
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "records",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": THEME.cluster,
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 12, 10, 18, 50, 26],
          "circle-stroke-color": THEME.pointBright,
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "records",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": THEME.clusterText },
      });

      // Unclustered point: blurred halo + solid core (the "glowing dot").
      map.addLayer({
        id: "point-glow",
        type: "circle",
        source: "records",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": THEME.point,
          "circle-blur": 1,
          "circle-opacity": 0.5,
          "circle-radius": 12,
        },
      });
      map.addLayer({
        id: "point-core",
        type: "circle",
        source: "records",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": THEME.pointBright,
          "circle-radius": 4,
          "circle-stroke-color": THEME.point,
          "circle-stroke-width": 1.5,
        },
      });

      wireInteractions(map);
      setReady(true);
    });

    // Stop the auto-spin as soon as the user grabs the globe.
    const stopSpin = () => setSpinning(false);
    map.on("mousedown", stopSpin);
    map.on("touchstart", stopSpin);
    map.on("wheel", stopSpin);
    map.on("dragstart", stopSpin);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Wire hover + click once layers exist.
  function wireInteractions(map: MLMap) {
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

    const interactive = ["clusters", "point-core", "point-glow"];
    for (const layer of interactive) {
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
    }

    map.on("mousemove", "point-core", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as { agency?: string; technology?: string };
      popup
        .setLngLat((f.geometry as any).coordinates)
        .setHTML(
          `<div style="font:12px/1.4 system-ui;color:#dbe6f2">
             <strong>${escapeHtml(p.technology || "Surveillance record")}</strong><br/>
             ${escapeHtml(p.agency || "")}
           </div>`
        )
        .addTo(map);
    });

    // Click a cluster: zoom in to expand it.
    map.on("click", "clusters", (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
      if (!f) return;
      const clusterId = f.properties?.cluster_id;
      const src = map.getSource("records") as GeoJSONSource;
      src.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({ center: (f.geometry as any).coordinates, zoom: Math.min(zoom + 0.5, 12) });
      });
    });

    // Click a point: gather all records stacked on that coordinate and open the drawer.
    // Match on the feature's stable `id` (clustering quantizes geometry coordinates,
    // so coordinate equality is unreliable) then group by that record's exact location.
    map.on("click", "point-core", (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (!id) return;
      const clicked = recordsRef.current.find((r) => r.id === id);
      if (!clicked) return;
      const here = recordsRef.current.filter(
        (r) => r.longitude === clicked.longitude && r.latitude === clicked.latitude
      );
      onSelect(here);
      map.easeTo({ center: [clicked.longitude, clicked.latitude], zoom: Math.max(map.getZoom(), 6) });
    });
  }

  // Keep the GeoJSON source in sync with filtered records.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("records") as GeoJSONSource | undefined;
    if (src) src.setData(toFeatureCollection(records) as any);
  }, [records, ready]);

  // Auto-spin loop + a gentle pulse on the point glow.
  useEffect(() => {
    spinRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const map = mapRef.current;
      if (map) {
        const dt = now - last;
        if (spinRef.current && !map.isMoving()) {
          const c = map.getCenter();
          c.lng = ((c.lng + dt * 0.004 + 180) % 360) - 180; // slow eastward drift
          map.setCenter(c);
        }
        // Gentle pulse of the glowing points.
        if (ready && map.getLayer("point-glow")) {
          const pulse = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(now / 700));
          map.setPaintProperty("point-glow", "circle-opacity", pulse);
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      <button
        onClick={() => setSpinning((s) => !s)}
        className="absolute bottom-20 right-4 z-20 rounded-md border border-edge bg-panel/80 px-3 py-1.5 text-xs text-[#dbe6f2] backdrop-blur transition hover:border-signal hover:text-signal"
      >
        {spinning ? "❚❚ pause spin" : "▶ spin"}
      </button>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
