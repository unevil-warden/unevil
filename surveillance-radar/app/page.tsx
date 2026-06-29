import MapExperience from "../components/MapExperience";
import records from "../data/processed/atlas-records.json";
import summary from "../data/processed/atlas-summary.json";
import type { MapRecord } from "../lib/atlas/schema";

// Records are produced at build time by `pnpm ingest:atlas` and imported statically,
// so the page ships as a fast static asset (no runtime data fetch).
export default function Page() {
  return <MapExperience records={records as unknown as MapRecord[]} summary={summary as any} />;
}
