MY BACK SHED — static build notes
==================================

WHAT CHANGED
------------
1. One style.css, one site.js.
   style1.css and style_css.bak had more complete/current styles than the
   old style.css (which was missing the FAQ accordion, fabric gallery,
   before/after slider, and scroll-hide-nav styles entirely — that's part
   of why things looked broken). Likewise, the old site.js was a stale
   pre-backend prototype missing the About/Services/Admin-tabs/quotes
   features your HTML actually calls. Everything has been merged into a
   single, complete style.css and site.js — no more "-1" files or .bak.

2. No server required.
   site.js used to call a real Express backend (fetch('/api/...')) for
   every piece of data — gallery items, page text, settings, quote
   requests, login sessions, Instagram. That's been replaced with a
   localStorage-backed data layer with the exact same function names, so
   all the admin/editing logic works unchanged. You can now just open
   index.html (or any page) directly, or drop this folder on any static
   host — no Node/Express process needed.

3. Fixed path/wiring bugs.
   - Every page now links to style.css and site.js directly (no more
     assets/style.css vs style.css mismatch, no more site1.js).
   - index.html had its own duplicate inline script re-implementing the
     hero slideshow/parallax/reveal — which fought with site.js's own
     copies of those same functions (double intervals, jumpy animation).
     Removed; site.js already handles it.
   - The quote-request form on services.html called a server endpoint
     that no longer exists — now saves to the local store like everything
     else, and shows up in the admin "Quote Requests" tab.

WHAT'S STORED WHERE (all localStorage, key prefix "mbs_")
-----------------------------------------------------------
mbs_gallery_items        gallery/shop pieces (seeded with 6 placeholders)
mbs_settings             seasonal banner on/off
mbs_pages                About Us + Upholstery & Painting page content
mbs_quote_requests       submissions from the quote form
mbs_admin_pw_hash        staff login password (default: MyBackShed2026!)

IMPORTANT LIMITS OF A NO-SERVER SITE
-------------------------------------
- Data lives in ONE browser on ONE device. Editing the gallery on your
  laptop won't show up on someone else's phone. Use the admin panel's
  "Download Backup" / "Restore From Backup" buttons to move data between
  browsers/devices, or to keep a safety copy.
- The staff admin password gate is enforced in the browser (not by a
  server) — fine for keeping casual visitors out, not real security.
  This is called out on the login screen itself.
- Instagram's live feed and any real checkout/payment integration need a
  real backend to talk to those APIs securely, so this build always shows
  the curated placeholder photos / "coming soon" messaging for those two
  things specifically. Everything else (gallery, shop, about, services,
  quotes, admin) is fully live and editable.

RUNNING IT
----------
Easiest: double-click index.html. Works in Chrome/Firefox/Edge.
Recommended: serve the folder with any static file server for the most
consistent behavior across all browsers (some browsers, notably Safari,
can restrict localStorage when pages are opened via file:// directly).
One quick way with Python already installed:
    cd my-back-shed-site
    python3 -m http.server 8000
then open http://localhost:8000 — still no backend/database involved,
just a plain static file server.

NOT INCLUDED
------------
mbs-logo.png is referenced by every page's header/footer but wasn't part
of the files you sent me — drop it in this same folder alongside these
files.
