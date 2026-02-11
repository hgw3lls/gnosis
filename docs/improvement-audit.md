# Gnosis product audit: from inventory log to true library management

This audit reframes Gnosis as a **library operations tool** (not just a catalog), with emphasis on:
- non-uniform bookcases,
- multiple physical locations,
- practical retrieval workflows,
- and better documentation history for each book.

## Current strengths

Gnosis already has several strong foundations:
- Canonical schema fields for placement (`bookcase_id`, `shelf`, `position`) so every book can have a physical address.
- A `Bookcase` model with per-case capacity (`shelves`, `capacity_per_shelf`) and normalization safeguards.
- Placement validation to avoid impossible slots and duplicate slot collisions.
- Useful metadata dimensions (`tags`, `collections`, `projects`, `status`, `notes`) that can support categorization and workflows.

## Main product gap

Right now, placement models each bookcase as a **uniform grid** (same capacity for every shelf in a case). That works for simple cases, but it breaks down when your real environment includes:
- mixed shelf heights,
- half-width shelves,
- deep vs shallow shelves,
- horizontal stacks,
- boxes/carts/end tables,
- and multiple rooms/buildings.

In short: the app stores *where books are* but not enough structure to represent *how your storage actually works*.

## Priority recommendations (what to build next)

## 1) Upgrade storage model to hierarchical locations

### Goal
Support complex real-world placement without forcing fake shelf numbers.

### Recommendation
Move from the current flat placement fields to a hierarchy:

- **Site** (House, Office, Cabin)
- **Room/Zone** (Living Room, Upstairs Hall)
- **Container** (Bookcase, Cabinet, Cart, Box)
- **Shelf/Section** (Top-left, Middle, Oversize bay)
- **Slot/Sequence** (Position or stack order)

### Why this helps
- Handles different furniture types cleanly.
- Lets users browse library physically: Site -> Room -> Container.
- Supports future maps and routing (“which room should I check?”).

### Migration strategy
Keep existing fields for backward compatibility, but introduce new normalized tables and auto-map existing records during migration.

## 2) Replace uniform shelf capacity with per-shelf configuration

### Goal
Model non-identical shelves in the same bookcase.

### Recommendation
Add a `BookcaseShelf` (or `ContainerSection`) entity:
- `id`, `container_id`, `label`
- `kind` (`linear`, `stack`, `bin`, `oversize`)
- `capacity_mode` (`count`, `width_mm`, `mixed`)
- `capacity_value`
- optional dimensions (`height_mm`, `depth_mm`, `width_mm`)

Then make book placement reference the specific shelf/section id, not just `(bookcase_id, shelf number)`.

### Why this helps
- One case can have shelf 1 = 40 books, shelf 2 = 18 oversize, shelf 3 = stacked journals.
- Eliminates false validation failures from a single `capacity_per_shelf`.

## 3) Add true categorization beyond free-text tags

### Goal
Make browsing and reporting more reliable than comma-separated text.

### Recommendation
Introduce structured taxonomies:
- **Subjects** (controlled vocabulary; many-to-many)
- **Series** + volume number
- **Audience** (reference, work, leisure, loanable)
- **Acquisition source** and cost/date
- **Condition** and preservation notes

Keep tags for ad-hoc notes, but add first-class linked tables for high-value categories.

### Why this helps
- Better filters and faceted search.
- Lower data drift (“sci-fi”, “scifi”, “science fiction” no longer fragment).
- Easier exports to analytics.

## 4) Build an organization workflow engine

### Goal
Help you actively organize, not just store records.

### Recommendation
Add operations workflows:
- **Re-shelving queue**: books with missing/invalid placement.
- **Move planner**: “move all books tagged `project:x` to Office Room B”.
- **Capacity alerts** per shelf/section.
- **Staging mode** for boxes during moves/renovation.
- **Audit checklist** by room/container (mark scanned/verified).

### Why this helps
Turns Gnosis into a practical “what should I do next?” assistant.

## 5) Improve documentation lifecycle per book

### Goal
Track how and why a book matters over time.

### Recommendation
Add entities for:
- **Reading sessions** (start/stop, pages, notes)
- **Annotations/highlights index** (page references)
- **Provenance history** (where acquired, signed copies, editions)
- **Lending log** (to whom, when due, returned)
- **Decision history** (keep, donate, archive)

### Why this helps
Creates durable knowledge records instead of one-off notes.

## 6) Strengthen retrieval UX for physical libraries

### Goal
Help you find a specific book fast in a messy, distributed library.

### Recommendation
Add:
- **Physical breadcrumb** in every result (Site > Room > Container > Shelf).
- **“Nearby books”** action (same shelf/section).
- **Shelf labels/QR codes** to open a filtered view instantly.
- **Map/list by location** first, then by metadata.

### Why this helps
Greatly reduces search friction when bookcases differ and are spread out.

## Suggested implementation roadmap

### Phase 1 (high impact, low migration risk)
1. Add Site/Room/Container entities.
2. Add per-shelf/section table and wire placement to section ids.
3. Keep old fields read-only in UI for compatibility.

### Phase 2 (organization workflows)
1. Re-shelving queue.
2. Move planner + capacity warnings.
3. Location-first browsing views.

### Phase 3 (documentation depth)
1. Reading sessions + annotation references.
2. Lending/provenance history.
3. Saved smart collections (“all unread in Office”).

## Quick wins you can ship immediately

- Add **location hierarchy fields** in UI forms (site + room as controlled values).
- Add **shelf labels** (human text, not only number) for non-standard cases.
- Add a **placement completeness score** dashboard (% books with exact physical slot).
- Add an **“unplaced books” saved filter** as a persistent queue.

## Product success metrics to track

- Median time to locate a requested book.
- % of books with complete physical placement.
- # of placement conflicts per week.
- # of books in “unplaced” queue.
- % of searches resolved through location-first navigation.

---

If you want, the next step is a concrete schema proposal (`v2`) with table definitions and migration notes from the current CSV contract.
