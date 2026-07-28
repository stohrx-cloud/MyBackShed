# My Back Shed — site + staff admin backend

This is the full site (homepage, gallery, shop, services, contact, and a
password-protected staff admin page) running behind a small Express server.
The server is what makes the admin page actually secure — the password is
hashed with bcrypt and never sent to the browser, login is a real
server-side session (not something JavaScript in the page can read or
fake), and the gallery data lives in a file on the server instead of one
browser's local storage.

## Running it in VS Code

1. Open this folder in VS Code.
2. Open a terminal (``Ctrl+` `` / `` Cmd+` ``) and install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file and fill in a real session secret:
   ```
   cp .env.example .env
   ```
   Then open `.env` and replace `SESSION_SECRET` with a random string. You can generate one with:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Start the server:
   ```
   npm start
   ```
   (or `npm run dev` — restarts automatically when you edit server.js)
5. Open **http://localhost:3000** in your browser.

The first time it runs, it creates `data/gallery.json` (seeded with sample
furniture photos) and `data/settings.json` (with a default staff password).
The terminal will print the default password — something like:

```
[first run] Created data/settings.json with the default staff password:
  MyBackShed2026!
  Log in at /admin.html and change it right away.
```

Go to **http://localhost:3000/admin.html**, log in with that password, and
change it immediately from the "Change Staff Password" panel.

## What's actually more secure now vs. the static-file version

- **Password**: hashed with bcrypt server-side. The browser never sees the
  hash or the plaintext — previously both were sitting in localStorage,
  readable by anyone with dev tools open.
- **Login state**: a real server session, stored server-side, referenced by
  an `httpOnly` cookie the page's own JavaScript can't read or forge.
  Previously "logged in" was just a flag in `sessionStorage` — trivial to
  set by hand in the console.
- **Brute force**: `/api/login` is rate-limited (8 attempts per 15 minutes
  per IP) at the server level, which can't be bypassed by editing
  client-side code the way the old in-browser lockout could be.
- **Gallery data**: lives in `data/gallery.json` on the server and photos
  in `uploads/`, so every visitor and every device sees the same gallery —
  no more "it only works on the browser I added it from."
- **File uploads**: validated server-side (image types only, 5MB limit) —
  the old version trusted whatever the browser sent.

## Homepage redesign (Cormorant Garamond + Jost)

The homepage picked up another round of visual polish: the "Upholstery &
Custom Painting" teaser is now two rows of photos auto-scrolling in
opposite directions (pause on hover), and the Instagram section is a
"polaroid wall" — tiles alternate a slight rotation and float at different
heights, like photos scattered on a table, straightening out on hover.

Both are real, backend-driven content, not decoration:
- The scrolling photos come from `services.craftTiles` — manage them from
  the **Pages** tab in admin (pick "Upholstery & Painting") under a new
  "Homepage Scrolling Photos" panel: add a photo + short caption, or
  remove one. The homepage automatically splits them into two rows and
  loops them seamlessly.
- The polaroid wall still shows real, live Instagram posts (same
  connection as before) — each tile links to that exact post. Nothing to
  manage here beyond the existing Instagram connect/disconnect flow.

The homepage got a full visual redesign: new fonts (Cormorant Garamond for
headings, Jost for body text), a simpler crossfading photo hero (no more
sliding doors), a parallax "treasure hunt" intro, two full-bleed asymmetric
editorial photo grids (Shop the Collection / Upholstery & Custom Painting),
and a parallax founder quote block linking to About Us. The Instagram
section keeps the real, live-connected grid (see "Connecting Instagram"
below) under a new parallax ribbon header, rather than a static placeholder.

The same fonts and nav (Home / Gallery / About Us / Shop / Upholstery &
Painting) now apply site-wide across every page for consistency.

A few older homepage sections were retired in this redesign — the sliding
French doors, the material ticker, the category shelf, the As-Is Room
drawer, the four-button CTA row, and the "Bestsellers" carousel (that last
one was always static/decorative, never tied to real gallery data). If any
of those are missed, they're straightforward to re-add or rebuild into the
new visual language — just ask.

Two new shared, reusable behaviors were added to `assets/site.js` that any
page can opt into by using the right class/attribute, no extra script
needed: any element with a `data-bg` attribute lazy-loads that background
image only once it's about to scroll into view, and any element with class
`parallax-bg` (inside a `position:relative` parent) gets a subtle scroll
parallax effect automatically.

## Connecting Instagram

The homepage (bottom) and the Gallery page (top) both show a live grid of
@mybackshed's Instagram posts — click any photo and it opens that exact post
on Instagram. Until it's connected, both spots show a friendly "Follow us on
Instagram" button instead, so nothing looks broken in the meantime.

**Why this needs a few manual steps:** Meta shut down the old simple
"personal account" Instagram API in December 2024. The only way to pull real
posts now is Meta's official Instagram API, which requires the account to be
a free Business or Creator account and requires creating a small developer
app under Lisa's (or whoever owns the account's) own Meta login. This is an
account-ownership step — nobody else can do it on her behalf. Once it's
done, the server handles everything else (connecting, fetching, caching,
refreshing) automatically.

### One-time setup (do this once)

1. **Switch the Instagram account to Professional.** In the Instagram app:
   Settings → Account type and tools → Switch to Professional Account →
   choose Business or Creator. Free, takes under a minute.
2. **Create a Meta developer app.** Go to
   [developers.facebook.com](https://developers.facebook.com), log in with
   the Facebook account tied to the Instagram account, and create a new app.
   Add the **Instagram** product to it (specifically "Instagram API with
   Instagram Login" — this path does *not* require linking a Facebook Page).
3. **Add a redirect URI.** In the app's Instagram API setup page, add:
   - `http://localhost:3000/auth/instagram/callback` for local testing
   - `https://yourrealdomain.com/auth/instagram/callback` once it's actually hosted
4. **Add the account as a tester** if the app is still in development mode
   (Meta requires this even to test with your own account) — the app
   dashboard will show you exactly where to send/accept this invite.
5. **Copy the App ID and App Secret** from the app dashboard into `.env`:
   ```
   IG_APP_ID=your_app_id_here
   IG_APP_SECRET=your_app_secret_here
   ```
6. **Double-check the scope name.** Meta has renamed these permission scopes
   before. On the app's Instagram API setup page, find the exact permission
   name it lists for reading media (something like `instagram_business_basic`)
   and make sure `IG_SCOPE` in `.env` matches it exactly.

### Connect it

1. Restart the server so it picks up the new `.env` values.
2. Log into `/admin.html`.
3. In the **Instagram Feed** panel, click **Connect Instagram**.
4. You'll be sent to Instagram to approve access, then bounced back with a
   "✅ Instagram connected!" confirmation.
5. That's it — refresh the homepage or Gallery page and real posts should
   appear within a few seconds (posts are cached for 30 minutes at a time,
   so brand-new posts may take up to that long to show up).

The server automatically checks daily whether the access token needs
refreshing and renews it in the background — there shouldn't be anything to
maintain day-to-day. If the feed ever silently reverts to the "Follow us"
fallback, check the terminal log for `[instagram]` messages, and use
**Disconnect** + **Connect Instagram** again in the admin panel to redo the
approval.

## Commerce Integration (Shopify / WooCommerce) — for later

The shop isn't connected to Shopify or WooCommerce yet — there isn't one
set up. But the groundwork is in:

- Every gallery item now has optional **Price** and **SKU / Product Code**
  fields (set them in the admin panel when adding or editing a piece). The
  SKU is meant to eventually match a real product in Shopify/WooCommerce.
- Clicking a piece in the Gallery (or the Shop list) opens a dedicated
  product page at `shop.html?item=<id>` — image, name, price, description,
  an "Enquire" button (works today), and a disabled "Add to Cart" button
  with a note that online checkout is coming soon.
- **`commerce.js`** is the one place to plug in a real platform later: set
  `COMMERCE_PROVIDER=shopify` or `woocommerce` in `.env`, add that
  platform's API credentials, and fill in `getProductLink()` (and
  `isConnected()`) using the Shopify Storefront API or WooCommerce REST
  API — matching by the `sku` field already stored on each item. Nothing
  else needs to change: the shop page already checks
  `GET /api/commerce/status` and will show a real "Add to Cart" once
  `isConnected()` returns true.

## Worth doing before this handles real customers

- **HTTPS.** Set `NODE_ENV=production` and put this behind a real HTTPS
  reverse proxy/host (Render, Railway, a VPS with Caddy/nginx, etc.) —
  `secure` cookies won't be sent over plain HTTP.
- **A real database** instead of JSON files, once there's more than one
  editor or you want proper concurrent-write safety.
- **Tighten the Content-Security-Policy.** It's currently disabled
  (`contentSecurityPolicy: false` in `server.js`) because a few pages use
  inline styles/scripts. Moving those into `assets/site.js` and turning on
  a strict CSP is a good follow-up hardening step.
- **Back up `data/` and `uploads/` regularly** (or use the Admin
  dashboard's "Download Backup" button) until there's a real database with
  its own backups.

## About Us page & the Pages admin tab

There's now a real `about.html` — history, passion, what makes the shop
different (the hand-painting/refinishing studio), philosophy, a photo grid,
and a "Meet the Team" section. Every nav link and footer link that used to
point at the old homepage quote section now points here instead.

None of that content is hardcoded — it all comes from `data/pages.json` and
is fully editable from a new **Pages** tab in the admin dashboard (next to
"Gallery & Settings"): edit the hero text and each section's heading/body,
add or remove photos, and add/edit/remove team members (name, role, bio,
photo) — all live, same as the gallery.

This was built generically on purpose: the plan is a dedicated page for most
of the other nav items too (Shop and Gallery already exist; Visit is likely
next). Each new one can reuse the same `data/pages.json` structure and the
same Pages-tab editor pattern — add a slug, seed some starter content, wire
up a public page, and it shows up in the admin page selector automatically.

## Upholstery & Custom Painting page

`services.html` covers: intro sections for upholstery and custom painting,
a static 4-step process overview, a draggable before/after comparison
slider, a fabric/finish swatch gallery, an FAQ accordion, and a quote
request form (with a "Contact Us" button at the bottom linking to
`contact.html`).

Like About Us, everything text-based is editable from the **Pages** tab in
admin (select "Upholstery & Painting"): hero text, the two intro sections,
and all four FAQ entries. Two new content types were added specifically for
this page and are managed from the same tab:

- **Before & After pairs** — upload a "before" and an "after" photo together
  with an optional label; each pair renders as its own drag-to-compare
  slider on the page.
- **Fabric swatches** — upload a photo + short label (e.g. "Sage Linen");
  shown as a grid on the page. Starts empty — add real fabric photos
  whenever they're ready; until then it shows a friendly "ask us in-store"
  placeholder instead of an empty grid.

The **process overview steps are static** for now (not yet driven by
`pages.json`) since they change far less often than the rest of the page —
happy to make them editable too if that turns out to be wrong.

### Quote requests

The quote form is fully wired to the backend — submissions are saved to
`data/quote-requests.json` and show up in a new **Quote Requests** tab in
admin (name, email, phone, project type, message, timestamp), where they
can be deleted once handled. There's no email notification yet — checking
that tab is currently the only way to see new requests come in; adding an
email alert (e.g. via a transactional email API) would be a reasonable
next step once the site is live.

## Project structure

```
server.js              — Express app, all routes, auth, uploads
commerce.js             — Shopify/WooCommerce extension point (not wired up yet)
package.json
.env.example            — copy to .env
data/
  gallery.json          — gallery items (auto-created)
  settings.json         — staff password hash + banner toggle (auto-created)
  instagram-token.json  — Instagram access token, created after you connect
  pages.json            — editable content for About Us (and future pages)
  quote-requests.json   — submissions from the Upholstery & Painting quote form
uploads/                — uploaded photos (auto-created)
public/                 — the actual website (served statically)
  index.html, gallery.html, shop.html, services.html, contact.html, about.html, admin.html
  assets/style.css, assets/site.js
  mbs-logo.png
```
