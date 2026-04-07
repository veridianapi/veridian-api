import "dotenv/config";
import { createInterface } from "readline";
import { Readable } from "stream";
import { supabase } from "../src/lib/supabase.js";

const SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";
const BATCH_SIZE = 500;

interface SdnRecord {
  name: string;
  entity_type: string;
  program: string;
}

/**
 * Minimal RFC-4180 CSV row parser.
 * Handles quoted fields (including embedded commas and escaped quotes).
 */
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead — "" is an escaped quote inside a quoted field
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(field.trim());
        field = "";
      } else {
        field += ch;
      }
    }
  }

  fields.push(field.trim());
  return fields;
}

async function insertBatch(records: SdnRecord[]): Promise<void> {
  const { error } = await supabase.from("ofac_sdn").upsert(records, {
    onConflict: "name,program",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`Supabase insert error: ${error.message}`);
}

async function main(): Promise<void> {
  console.log(`Downloading OFAC SDN list from ${SDN_URL} ...`);

  const response = await fetch(SDN_URL);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to fetch SDN list: HTTP ${response.status}`);
  }

  // Convert the web ReadableStream to a Node Readable for readline
  const nodeStream = Readable.fromWeb(
    response.body as import("stream/web").ReadableStream
  );

  const rl = createInterface({ input: nodeStream, crlfDelay: Infinity });

  const batch: SdnRecord[] = [];
  let totalInserted = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    const cols = parseRow(line);
    const name = cols[1]?.trim();
    const entityType = cols[2]?.trim();
    const program = cols[3]?.trim();

    // Skip rows without a usable name
    if (!name || name === "-0-") {
      skipped++;
      continue;
    }

    batch.push({ name, entity_type: entityType ?? "", program: program ?? "" });

    if (batch.length === BATCH_SIZE) {
      await insertBatch(batch);
      totalInserted += batch.length;
      console.log(`  Inserted ${totalInserted} records...`);
      batch.length = 0;
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await insertBatch(batch);
    totalInserted += batch.length;
  }

  console.log(
    `Done. ${totalInserted} records inserted, ${skipped} rows skipped.`
  );
}

main().catch((err) => {
  console.error("load-ofac failed:", err);
  process.exit(1);
});
