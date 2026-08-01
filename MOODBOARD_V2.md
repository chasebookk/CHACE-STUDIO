# Moodboard v2: bugs, atmosphere, navigation, image sources
*Follows MOODBOARD_BRIEF.md. Steps 1 to 4 are live. This is the next pass.*

---

## 1. BUGS, fix these first

### Images and notes show a broken icon until reload
Adding an item currently waits on the server before it can render, so the DOM gets an element with no usable `src` and the browser draws its broken-image glyph.

**Fix, optimistic rendering:**
- The moment a file is dropped, chosen or pasted, create the item in local state and render it **immediately** using `URL.createObjectURL(file)` as the src. It appears instantly, at the drop point, at its drop angle.
- Show a subtle shimmer or progress ring over that card while the upload runs.
- When the upload resolves, **swap the src to the Blob URL** and `URL.revokeObjectURL` the temporary one. The user should see no flicker and no reflow.
- If the upload fails, keep the card, mark it with a small retry affordance, and never silently drop it.

Same principle for **notes**: render from local state on click, focus the caret immediately, persist in the background. Nothing user-visible should ever wait on a network round trip.

**Acceptance:** drop an image with the network throttled to Slow 3G. It must appear instantly and sharpen into place when the upload finishes. No broken icon at any point.

---

## 2. Living background

The canvas should feel like a studio wall, not a blank page. Behind everything, a slow-moving field of CHACE work and brand marks.

**Design:**
- A **curved, perspective grid** of portfolio thumbnails, gently bowed so it reads as a wall receding into the distance rather than a flat tile pattern
- Tiles **drift slowly** and **crossfade** to new portfolio images every 8 to 12 seconds, staggered so it never pulses in unison
- Interleave **brand marks**: the CHACE wordmark and the orange to red gradient shapes, at low frequency
- Very slow parallax, the background moves at roughly 0.3× the canvas pan

**This must never compete with the client's moodboard. Non-negotiable rules:**
- Base opacity **4 to 6%**, blurred `~8px`, desaturated to roughly 30%
- The layer **dims further to ~2%** as soon as the board has items on it, and lifts back up when the board is empty. An empty board feels alive and inviting; a full board gets out of the way
- Motion **pauses entirely while the user is dragging, drawing or typing**. Never animate under an interaction
- Fully disabled under `prefers-reduced-motion: reduce`, replaced with a single static frame
- GPU-composited `transform` and `opacity` only, never animate layout properties
- Cap the visible tiles so this stays cheap. Pause the whole layer when the tab is hidden

If in doubt, err fainter. The client's images are the point; this is atmosphere.

---

## 3. Never getting lost

Four changes, all needed:

**a. Fly to content on open.** On load, compute the bounding box of all items and animate the camera to fit them with a soft ease, about 900ms. It should feel like being walked to the table. If the board is empty, rest at origin with the invitation state.

**b. "Fit to view" control.** A button, plus keyboard `F`, that re-runs that same animation at any time. This is the escape hatch when someone has scrolled into empty space.

**c. Minimap.** Bottom-right, small, showing item positions as dots and the current viewport as a rectangle. Click or drag it to jump. This is what actually stops people getting lost, because it makes the space legible.

**d. Elastic boundary.** Panning far beyond the content meets gentle resistance and, released, springs back toward the items. You physically cannot lose the board. Also clamp zoom to roughly 0.25× to 3×.

---

## 4. Image sources drawer

Replace the single portfolio tray with a tabbed drawer. Same interaction throughout: browse, then **drag straight onto the canvas**, never leaving the page.

| Tab | Source | Notes |
|---|---|---|
| **CHACE** | `public/assets/img/portfolio/` | My own work, categorised as now |
| **Unsplash** | Unsplash API | Free, official, high quality |
| **Pexels** | Pexels API | Free, official |
| **Pixabay** | Pixabay API | Free, official, good for props and textures |

Each tab gets **preset category chips** so a client never faces an empty search box:
`Weddings` · `Portraits` · `Maternity` · `Graduation` · `Studio lighting` · `Editorial` · `Colour palettes` · `Poses` · `Set design`

Chips run a search against that tab's API. A free-text search box sits alongside for anything else. Results load in a masonry strip, infinite scroll, and each result is draggable onto the canvas.

**Implementation notes:**
- All API calls go through **our own server routes** (`/api/images/[provider]`), never the browser, so keys stay server-side
- **Cache results** in memory for a few minutes per query, these APIs are rate-limited
- When an item is dragged onto the board, **download it server-side and store it in our Blob**, so the board never breaks if the source URL rotates
- Store `source`, `author` and `source_url` on the item. Unsplash's licence requires attribution; show it as a small credit on hover
- Env vars: `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`. If a key is missing, hide that tab rather than showing an error

---

## 5. Board management for new clients

Build the `/admin/boards` page now, this is blocking real client work.

- **Create board**: client name, optional title, optional linked booking. Generates the slug, returns the link, copy button
- **List**: all boards, client name, item count, last activity, open and copy and delete
- **Delete**: confirm, cascades items and their Blob files
- On each booking row in the main admin, a **"Moodboard"** button that creates a board pre-titled from that booking and copies the link. Book, generate, send

---

## Build order
1. Optimistic rendering, both bugs
2. Fly-to-content, Fit to view, elastic boundary, minimap
3. `/admin/boards` and the booking-row button
4. Image sources drawer, Unsplash first, then Pexels and Pixabay
5. Living background, last, because it is polish and must not delay the rest

## Acceptance
- [ ] Images and notes appear instantly on Slow 3G, no broken icon ever
- [ ] Opening a board flies to the content
- [ ] `F` refits, minimap navigates, panning away springs back
- [ ] A client can search "wedding" in Unsplash and drag a result onto the board without leaving the page
- [ ] Dragged-in external images survive the source going away, because we re-host them
- [ ] Background never rises above 6% opacity and stops during interaction
- [ ] I can create a board for a new client in under 15 seconds
