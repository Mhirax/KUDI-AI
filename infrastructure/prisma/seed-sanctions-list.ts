import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SOURCE = 'OFAC_SDN';
const DATA_FILE = join(__dirname, 'data', 'ofac-sdn-individuals.csv');

/**
 * Minimal, dependency-free CSV parser — handles quoted fields, embedded
 * commas, escaped double-quotes (""), and newlines inside quoted
 * fields. Good enough for this one fixed, known-shape data file; not
 * meant as a general-purpose CSV utility.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (char === '\r') {
      i++;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Seeds `SanctionsListEntry` from the free OFAC SDN individuals
 * snapshot (see infrastructure/prisma/data/README.md for provenance
 * and refresh notes). Safe to re-run: replaces every row for this
 * source in one pass rather than diffing row-by-row, so re-seeding
 * after downloading a fresh copy of the CSV is idempotent and never
 * leaves a stale/delisted entry behind.
 */
async function seedSanctionsList(): Promise<void> {
  const raw = readFileSync(DATA_FILE, 'utf8');
  const rows = parseCsv(raw).slice(1); // drop header row

  const entries = rows
    .filter((cols) => cols.length >= 4 && cols[0].trim().length > 0)
    .map((cols) => ({
      source: SOURCE,
      externalId: cols[0].trim(),
      fullName: cols[1].trim(),
      program: cols[2].trim() || null,
      remarks: cols[3].trim() || null,
    }));

  await prisma.sanctionsListEntry.deleteMany({ where: { source: SOURCE } });
  await prisma.sanctionsListEntry.createMany({ data: entries });

  console.log(`Seeded ${entries.length} SanctionsListEntry rows for source=${SOURCE} (replaced).`);
}

async function main(): Promise<void> {
  await seedSanctionsList();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
