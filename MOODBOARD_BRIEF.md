# CHACE STUDIOS — Shared Moodboard Canvas
*A private, link-shared creative space where a client and I build the look of their shoot together. Padlet's freedom, Figma's feel, CHACE's brand.*

---

## The idea in one line
Every client gets a secret link to an open canvas. They drag in images that inspire them, I drag in frames from my portfolio, we both scatter, annotate, draw and sign on it until the shoot has a direction.

**Not** a grid. **Not** a list. Things sit where you put them, at the angle you dropped them.

---

## Routes

| Route | Who | What |
|---|---|---|
| `/board/[slug]` | Client, via secret link | The canvas. No login |
| `/admin/boards` | Me | Create a board per client, copy its link, delete old ones |

`slug` is unguessable, e.g. `divine-7f3a9c`. Set **`noindex, nofollow`**. Anyone with the link can edit, which is the point, so the secrecy of the link is the security. Never list boards publicly.

---

## Data model

```sql
CREATE TABLE boards (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  title TEXT,                       -- "Opeyemi Divine, Individual Portrait"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE board_items (
  id SERIAL PRIMARY KEY,
  board_id INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,               -- photo | note | ink | text
  x REAL NOT NULL, y REAL NOT NULL,
  rotation REAL DEFAULT 0,
  scale REAL DEFAULT 1,
  z INT DEFAULT 0,
  url TEXT,                         -- photo: blob URL
  caption TEXT,                     -- photo caption / note body / text body
  colour TEXT,                      -- note colour
  path TEXT,                        -- ink: SVG path data
  author TEXT,                      -- 'studio' | 'client', for the tiny credit dot
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Canvas behaviour

- **Infinite pan** by dragging empty space, **zoom** with pinch or scroll, both with inertia
- **Free positioning.** Nothing snaps. Store x, y, rotation, scale, z
- **Pick up:** item scales to 1.06, shadow deepens, tilts slightly in the direction of travel
- **Drop:** settles to a small random rotation so the board always looks hand-arranged
- Click an item to bring it to front (increment z)
- Delete with a small × on hover, or select and press Delete

## Adding things

1. **Drag files straight onto the canvas** from Finder, dropping at the cursor
2. **Paste from clipboard** (Cmd+V on a copied image)
3. **Upload button** for phone gallery, `accept="image/*"` so mobile offers camera roll
4. **Portfolio drawer**: a slide-out tray on the left holding my portfolio images from `public/assets/img/portfolio/`, filterable by category, drag any of them onto the board
5. **Note button** adds a sticky note in brand colours, click to type
6. **Text tool** for a caption anywhere on the canvas
7. **Draw tool** for freehand ink, used for arrows, circling a detail, handwritten notes and signatures. Colour swatches: red `#FF1909`, amber `#FFA600`, white, black

Every photo has an optional **caption** underneath, click to edit, so either of us can say why it's there.

## Uploads
- **Vercel Blob** (`@vercel/blob`), needs `BLOB_READ_WRITE_TOKEN` in Vercel
- Client-side resize to max 1600px before upload, JPEG q80, keeps boards fast
- Accept jpg, png, webp, heic. Reject over 15MB with a friendly message
- Show an upload progress shimmer on the placeholder card

## Saving and sync
- Save on drop, on edit, debounced 400ms. Never a manual save button
- **Poll every 3 seconds** for changes from the other person and reconcile by item id. True realtime websockets are not needed for two people and add failure modes
- Show a quiet presence line: "Divine was here 2 minutes ago"
- Optimistic updates so it always feels instant

---

## Motion, this is what makes it feel expensive

- Items **enter** with a spring scale from 0.6, slight overshoot
- **Lift and tilt** on grab as in the prototype
- Portfolio drawer slides with a spring, images inside stagger in
- Subtle **parallax**: the dot grid drifts slower than the items when panning
- Ink strokes **draw on** with a stroke-dashoffset animation when loaded from the database, so an existing board feels alive when you open it
- Empty board state: three of my portfolio frames drift slowly in the background at low opacity, inviting the first drop
- Honour `prefers-reduced-motion: reduce` by disabling drift, stagger and entrance animations. Dragging still works

---

## Brand
Dark cinematic, matching the site: near-black `#0a0a0a` canvas, dot grid, orange to red gradient `#FFA600 → #FF1909 → #840202` on active tools. Photos render as **off-white polaroid frames** with the caption in italic serif underneath, which makes a scattered board read as a physical table of prints rather than a web page.

Header: `CHACE` wordmark, the client's name, and a share button that copies the link.

---

## Admin
`/admin/boards`, behind the existing auth:
- Create board: client name + title, generates the slug, returns the link
- List boards with item counts and last activity
- Copy link button
- Delete board, with confirm, cascades to items and Blob files

Add a **"Moodboard" button on each booking row** in the main admin that creates a board pre-titled from that booking. That connects the two systems: a client books, I generate their board, I send the link.

---

## Build in this order
1. Schema, `/board/[slug]` rendering saved items, pan and zoom
2. Drag, drop, persist position
3. Image upload: drag-drop, paste, picker, Blob
4. Notes and captions
5. Portfolio drawer
6. Ink tool
7. Polling sync and presence
8. Admin pages
9. Motion pass and reduced-motion
10. Mobile: touch drag, pinch zoom, upload from gallery

**Ship 1 to 4 first and show me**, that is already usable. The rest layers on.

---

## Acceptance
- [ ] Two browsers on the same link see each other's changes within a few seconds
- [ ] Items land where dropped, at the dropped angle, after a reload
- [ ] Upload works from a phone gallery
- [ ] Ink strokes persist and redraw
- [ ] Board is unreachable without the slug and carries noindex
- [ ] Works with a trackpad, a mouse and a touchscreen
- [ ] `npm run build` clean, no secrets committed
