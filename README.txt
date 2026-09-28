Genting Family Trip PWA
https://dahdahdave.github.io/Genting/

USING THE PLANNER
- Every stop has Swap plan, Edit, move up/down and Move to day controls.
- Drag the dotted handle with touch, mouse or pen. Hold over a day tab to
  reveal that day; drop on the tab to append, or on a stop to reorder.
- Times move with their stops and do not recalculate. Edit times after moving.
- Swap with an activity, food venue, shop or spa, or write a custom plan.
- Use in itinerary in the directory lets you choose which stop to replace.
- Undo reverses the last 30 changes in the current session.
- Restore this stop restores its original content; Restore original itinerary
  restores all four days. The checklist remains separate.

DIRECTORY
Snapshot checked on 28 September 2026 using the official SkyAvenue,
First World, Genting Grand, Awana SkyCentral and Premium Outlets directories,
plus selected Gohtong Jaya listings. Every venue has a source link.
Retail branches at different locations are separate entries. Known conflicting
names are flagged. Coming-soon outlets are excluded. Cuisine tags aid browsing;
they are not dietary certifications. Opening hours are not live. Independent
businesses outside these directories are not exhaustively covered.

OFFLINE AND STORAGE
Open online until Ready offline appears. The itinerary, filters, venue snapshot
and checklist then work offline. External maps and sources require internet.
Plans save locally on the device, not to GitHub. They do not sync between devices.
Clearing site data removes saved plans. Original meal choices and checklist keys
are migrated without changing the originals. Invalid prior plan data is retained
until an explicit edit, when a recovery copy is made before writing new data.
A storage failure displays a session-only notice.

DEVELOPMENT
Static HTML/CSS/JavaScript, no build step or runtime dependencies.
Serve the repository over HTTP locally (for example python -m http.server).
trip-data.js: original itinerary with stable stop IDs and legacy meal indexes.
venues.js: directory snapshot, category/cuisine tags, locations and source URLs.
app.js: rendering, edits, filtering, migration and pointer drag handling.
styles.css: responsive layout. sw.js: versioned offline cache.
Icons are in the repository root. Bump the cache name in sw.js for each release.
GitHub Pages deploys main at the repository root.

VALIDATION
Browser checks cover legacy migration; any-stop alternatives and custom text;
combined cuisine/location filters; directory-to-slot replacement; cross-day
moves; touch and mouse dragging; cancellation and undo; persisted reload;
offline reload and cached assets; invalid storage; mobile overflow; move buttons.
