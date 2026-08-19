# Seed data

## `ofac-sdn-individuals.csv`

A filtered snapshot of the US Treasury OFAC Specially Designated
Nationals (SDN) list — **individuals only** (entities, vessels, and
aircraft excluded; this is a person-name screening feature, not a
company one).

- **Source:** https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV
  (OFAC's public Sanctions List Service — free, no API key, no vendor
  contract).
- **Downloaded:** 2026-08-19.
- **Original size:** 19,203 total entries (individuals, entities,
  vessels, aircraft). Filtered down to 7,481 individual entries.
- **Fields kept:** `id` (OFAC's own `ent_num`), `fullName`, `program`
  (sanctions program code, e.g. `SDGT`), `remarks` (truncated to 400
  chars — DOB/POB/aliases/etc., useful context for a human reviewer,
  not itself matched against).

## This is a point-in-time snapshot, not a live feed

OFAC updates the SDN list continuously (new designations, delistings).
This file does **not** auto-refresh — screening against it means
screening against the list as of the download date above, not today's
actual list. For an MVP this is a deliberate, documented trade-off
(free, zero infrastructure, real data) rather than an oversight — see
`modules/compliance/implementation.md`, Phase 4a.

**Before this matters for real compliance decisions**, re-download and
re-seed periodically (a cron job or manual process — not built yet).
The same source URL above always returns the current list; re-run
`infrastructure/prisma/seed-sanctions-list.ts` after replacing this
file to pick up the update — it's safe to re-run: it replaces every
row for `source = 'OFAC_SDN'` in one pass rather than diffing
row-by-row, so re-seeding is idempotent and a stale/delisted entry
from a prior download never lingers.

## Why OFAC SDN, not a paid provider

Confirmed with the product owner: for a base MVP, a free, real,
legally-recognized watchlist beats either (a) paying for a commercial
PEP/sanctions aggregator (ComplyAdvantage, Refinitiv World-Check, Dow
Jones, etc.) before the product needs that scale, or (b) shipping a
stub that never actually screens anyone. `ISanctionsScreeningProvider`
(`modules/compliance/domain/services/sanctions-screening-provider.interface.ts`)
is a swappable port — the same pattern `IIdentityVerificationProvider`
already uses for Flutterwave — so a paid provider can replace this
implementation later without touching application/domain code.
