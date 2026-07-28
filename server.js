/* =====================================================================
   My Back Shed — server.js
   A small Express backend that replaces the old browser-localStorage
   demo with real server-side storage and real server-side auth:
     - the staff password is hashed with bcrypt and never sent to the browser
     - login state is a server-side session (httpOnly cookie) — client-side
       JavaScript cannot read or forge it, unlike the old sessionStorage flag
     - repeated failed logins are rate-limited per IP
     - gallery data + uploaded photos live in files on the server, shared
       by every visitor/device, instead of being stuck in one browser
   This is a solid setup for a small single-owner site run over HTTPS on
   real hosting. It is intentionally simple — see README.md for the
   handful of things worth doing before this handles real customer data
   at scale (a couple of them are called out inline below too).
   ===================================================================== */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const commerce = require('./commerce');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PAGES_FILE = path.join(DATA_DIR, 'pages.json');
const QUOTES_FILE = path.join(DATA_DIR, 'quote-requests.json');
const DEFAULT_PASSWORD = 'MyBackShed2026!';

/* ---------------- Instagram integration config ---------------- */
const IG_TOKEN_FILE = path.join(DATA_DIR, 'instagram-token.json');
const IG_APP_ID = process.env.IG_APP_ID || '';
const IG_APP_SECRET = process.env.IG_APP_SECRET || '';
const IG_SCOPE = process.env.IG_SCOPE || 'instagram_business_basic';
const IG_GRAPH_VERSION = process.env.IG_GRAPH_VERSION || ''; // e.g. 'v21.0', or '' for unversioned
const IG_HOST = 'https://graph.instagram.com' + (IG_GRAPH_VERSION ? '/' + IG_GRAPH_VERSION : '');
let igPostsCache = { data: null, fetchedAt: 0 };
const IG_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — keeps the feed "live" without hammering the API

function getStoredIgToken() {
  if (fs.existsSync(IG_TOKEN_FILE)) {
    try { return JSON.parse(fs.readFileSync(IG_TOKEN_FILE, 'utf8')); } catch (e) { return null; }
  }
  return null;
}

function saveIgToken(accessToken, expiresInSeconds) {
  const record = {
    accessToken,
    obtainedAt: Date.now(),
    expiresAt: Date.now() + (expiresInSeconds || 5184000) * 1000 // default ~60 days
  };
  writeJSON(IG_TOKEN_FILE, record);
  igPostsCache = { data: null, fetchedAt: 0 }; // force a fresh fetch with the new token
  return record;
}

async function refreshIgTokenIfDue() {
  const token = getStoredIgToken();
  if (!token || !token.accessToken) return;
  // Meta allows refreshing any time after 24h from issue; refresh proactively well before the 60-day expiry.
  const dueForRefresh = Date.now() > token.obtainedAt + (24 * 60 * 60 * 1000);
  if (!dueForRefresh) return;
  try {
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token.accessToken)}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.access_token) {
      saveIgToken(json.access_token, json.expires_in);
      console.log('[instagram] Access token refreshed.');
    } else {
      console.warn('[instagram] Token refresh did not return a new token:', json);
    }
  } catch (err) {
    console.warn('[instagram] Token refresh failed (will retry later):', err.message);
  }
}

/* ---------------- first-run setup: seed data files if missing ---------------- */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

if (!fs.existsSync(GALLERY_FILE)) {
  const seedItems = [
    { id: 'seed-1', images: ['https://images.unsplash.com/photo-1519710164239-da123dc03ef4?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt: 'Painted French armoire', caption: 'Hand-painted armoire in soft sage, one of a kind.', seasonal: true, price: '$450', sku: '' },
    { id: 'seed-2', images: ['https://images.unsplash.com/photo-1567016432779-094069958ea5?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt: 'Antique wing chair', caption: 'Reupholstered wing chair in vintage linen.', seasonal: false, price: '$260', sku: '' },
    { id: 'seed-3', images: ['https://images.unsplash.com/photo-1503602642458-232111445657?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src: 'https://images.unsplash.com/photo-1503602642458-232111445657?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt: 'Farmhouse dining table', caption: 'Reclaimed oak farmhouse table, hand-waxed finish.', seasonal: true, price: '$680', sku: '' },
    { id: 'seed-4', images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt: 'Vintage brass mirror', caption: 'Circa 1920s brass mirror, fully restored.', seasonal: false, price: '$95', sku: '' },
    { id: 'seed-5', images: ['https://images.unsplash.com/photo-1616627561839-074385245ff6?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src: 'https://images.unsplash.com/photo-1616627561839-074385245ff6?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt: 'Painted console table', caption: 'Distressed console in antique white.', seasonal: true, price: '$310', sku: '' },
    { id: 'seed-6', images: ['https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt: 'Cottage bedroom corner', caption: 'French cottage styling, ready for your space.', seasonal: false, price: '$210', sku: '' }
  ];
  fs.writeFileSync(GALLERY_FILE, JSON.stringify(seedItems, null, 2));
}

if (!fs.existsSync(SETTINGS_FILE)) {
  const seedSettings = {
    seasonalEnabled: true,
    passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 10)
  };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(seedSettings, null, 2));
  console.log('\n[first run] Created data/settings.json with the default staff password:');
  console.log(`  ${DEFAULT_PASSWORD}`);
  console.log('  Log in at /admin.html and change it right away.\n');
}

const DEFAULT_PAGES = {
  about: {
      hero: {
        eyebrow: 'Est. 2001 · Oakville, Ontario',
        title: 'The Story Behind My Back Shed',
        intro: "What started as a small collection of hand-painted finds has grown into Oakville's go-to spot for French country antiques, custom upholstery, and one-of-a-kind treasures."
      },
      sections: [
        {
          id: 'history',
          heading: 'Our History',
          body: "My Back Shed opened its doors on Kerr Street in 2001 with a simple idea: give beautiful old furniture a second life. What began as weekend flea-market finds, lovingly restored in a backyard shed, grew into a full boutique — but the name, and the spirit behind it, never changed."
        },
        {
          id: 'passion',
          heading: 'Our Passion',
          body: "Every piece that comes through our doors is chosen because it has character — a story worth continuing. We fall in love with the imperfections: the worn edges, the old hardware, the layers of paint waiting to be uncovered. That's the treasure hunt we want every customer to feel too."
        },
        {
          id: 'unique',
          heading: 'What Makes Us Different',
          body: "Our in-house hand-painting and refinishing studio is what truly sets us apart. Every finish is hand-mixed and hand-applied — no two pieces are ever quite the same. From custom upholstery to full furniture restorations, we don't just sell antiques, we bring them back to life."
        },
        {
          id: 'philosophy',
          heading: 'Our Philosophy',
          body: 'We believe a home should feel collected, not decorated — full of pieces with history and warmth rather than matching sets. Whether it\u2019s a $45 brass sconce or a fully restored farmhouse table, we treat every piece, and every customer, with the same care.'
        }
      ],
      photos: [],
      team: [
        {
          id: 'team-1',
          name: 'Lisa Barsony',
          role: 'Owner & Founder',
          bio: 'Lisa opened My Back Shed in 2001 and has hand-picked nearly every piece that\u2019s come through the door since. She still does much of the hand-painting herself.',
          photo: ''
        }
      ]
    },
    services: {
      hero: {
        eyebrow: 'In-House Craftsmanship',
        title: 'Upholstery & Custom Painting',
        intro: "Bring us a piece that needs new life — ours or your own. Every reupholster and every hand-painted finish is done right here, start to finish, by our own team."
      },
      sections: [
        {
          id: 'upholstery',
          heading: 'Custom Upholstery',
          body: "From a single dining chair to a full sofa, we handle reupholstery start to finish — new foam and padding where needed, hand-tied springs on older frames, and a fabric of your choosing (yours or from our in-house library). Typical turnaround is 3–4 weeks depending on fabric availability and project size."
        },
        {
          id: 'painting',
          heading: 'Hand-Painted Finishes',
          body: "Our signature finish. Hand-mixed paint, distressing, and glazing bring French country charm to dressers, hutches, tables, and armoires — yours or one of ours. Bring in your piece for a free consultation on colour and finish options."
        }
      ],
      faqs: [
        {
          id: 'faq-1',
          question: 'How long does a project typically take?',
          answer: 'Most single-piece reupholstery projects take 3–4 weeks depending on fabric availability. Custom painting typically takes 1–2 weeks.'
        },
        {
          id: 'faq-2',
          question: 'Can I supply my own fabric?',
          answer: "Yes — we're happy to work with fabric you provide, or help you choose from our in-house library."
        },
        {
          id: 'faq-3',
          question: 'Do you offer pickup and delivery?',
          answer: 'We offer local pickup and delivery in Oakville for an additional fee — ask us for a quote when you request one.'
        },
        {
          id: 'faq-4',
          question: 'How much does it cost?',
          answer: "Every piece is different. Send us a few photos through the quote form below and we'll get back to you with an estimate."
        }
      ],
      transformations: [],
      swatches: [],
      craftTiles: [
        { id: 'craft-1', src: 'https://images.unsplash.com/photo-1695457264710-304756bfc89c?fm=jpg&q=70&w=900&fit=crop&auto=format', label: 'The Reupholstery' },
        { id: 'craft-2', src: 'https://images.unsplash.com/photo-1712668401428-df42b8bd93fc?fm=jpg&q=70&w=900&fit=crop&auto=format', label: 'Fabric Selection' },
        { id: 'craft-3', src: 'https://images.unsplash.com/photo-1641308343697-9fa874fbbb5f?fm=jpg&q=70&w=900&fit=crop&auto=format', label: 'Hand-Painted Finish' },
        { id: 'craft-4', src: 'https://images.unsplash.com/photo-1593069431672-f903a33c286f?fm=jpg&q=70&w=900&fit=crop&auto=format', label: 'Before & After' },
        { id: 'craft-5', src: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?fm=jpg&q=70&w=900&fit=crop&auto=format', label: 'Hardware & Detail' },
        { id: 'craft-6', src: 'https://images.unsplash.com/photo-1653971858625-9cb23d0dca80?fm=jpg&q=70&w=900&fit=crop&auto=format', label: 'Finishing Touches' }
      ]
    }
};

if (!fs.existsSync(PAGES_FILE)) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify(DEFAULT_PAGES, null, 2));
} else {
  // Migration: an existing pages.json from before a given default page (or a
  // given field on a page, like craftTiles being added to "services" later)
  // existed won't have it. Backfill anything missing rather than leaving it
  // permanently 404ing or silently absent.
  const existingPages = JSON.parse(fs.readFileSync(PAGES_FILE, 'utf8'));
  let pagesChanged = false;
  for (const slug of Object.keys(DEFAULT_PAGES)) {
    if (!existingPages[slug]) {
      existingPages[slug] = DEFAULT_PAGES[slug];
      pagesChanged = true;
      console.log(`[pages] Backfilled missing "${slug}" page into data/pages.json`);
    } else {
      for (const field of Object.keys(DEFAULT_PAGES[slug])) {
        if (existingPages[slug][field] === undefined) {
          existingPages[slug][field] = DEFAULT_PAGES[slug][field];
          pagesChanged = true;
          console.log(`[pages] Backfilled missing "${field}" on the "${slug}" page`);
        }
      }
    }
  }
  if (pagesChanged) {
    fs.writeFileSync(PAGES_FILE, JSON.stringify(existingPages, null, 2));
  }
}

if (!fs.existsSync(QUOTES_FILE)) {
  fs.writeFileSync(QUOTES_FILE, JSON.stringify([], null, 2));
}

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

/* ---------------- security middleware ---------------- */

// CSP is left off here because the existing pages use inline <style> attributes
// and a couple of inline event handlers (e.g. the contact form). Before this
// goes on real public hosting, the better long-term fix is to move those inline
// bits into assets/site.js and turn on a strict CSP (script-src 'self', etc.)
// rather than allowing 'unsafe-inline'. Flagging it here so it doesn't get lost.
app.use(helmet({ contentSecurityPolicy: false }));

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  name: 'mbs.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,           // client-side JS cannot read this cookie at all
    sameSite: 'lax',          // solid default CSRF mitigation for same-site requests
    secure: IS_PROD,          // requires HTTPS once actually deployed
    maxAge: 1000 * 60 * 60 * 4 // 4 hour session
  }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many login attempts. Please wait a few minutes and try again.' }
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

/* ---------------- file upload handling ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  }
});

/* ---------------- static files ---------------- */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

/* ---------------- auth helpers ---------------- */
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

/* ================= AUTH ROUTES ================= */

app.get('/api/session', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.isAdmin) });
});

app.post('/api/login', loginLimiter, (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ ok: false, error: 'Password required' });

  const settings = readJSON(SETTINGS_FILE);
  const match = bcrypt.compareSync(password, settings.passwordHash);
  if (!match) return res.status(401).json({ ok: false, error: 'Incorrect password' });

  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.post('/api/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters.' });
  }
  const settings = readJSON(SETTINGS_FILE);
  if (!bcrypt.compareSync(currentPassword || '', settings.passwordHash)) {
    return res.status(401).json({ ok: false, error: 'Current password is incorrect.' });
  }
  settings.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeJSON(SETTINGS_FILE, settings);
  res.json({ ok: true });
});

/* ================= SETTINGS (seasonal banner toggle) ================= */

app.get('/api/settings', (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  res.json({ seasonalEnabled: settings.seasonalEnabled });
});

app.post('/api/settings', requireAdmin, (req, res) => {
  const settings = readJSON(SETTINGS_FILE);
  if (typeof req.body.seasonalEnabled === 'boolean') {
    settings.seasonalEnabled = req.body.seasonalEnabled;
  }
  writeJSON(SETTINGS_FILE, settings);
  res.json({ ok: true, seasonalEnabled: settings.seasonalEnabled });
});

/* ================= GALLERY ================= */

// Older items only ever had a single `src`. This makes sure every item the
// API returns has a proper `images` array (with `src` kept as images[0] for
// anything on the site that still just wants one cover photo).
// Auto-prepends a "$" to a price estimate if the admin didn't already type
// a currency symbol — so "450" and "$450" both end up as "$450".
function formatPrice(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  return /^[$€£]/.test(trimmed) ? trimmed : '$' + trimmed;
}

function normalizeItem(it) {
  const images = Array.isArray(it.images) && it.images.length ? it.images : (it.src ? [it.src] : []);
  return { ...it, images, src: images[0] || it.src };
}

app.get('/api/gallery', (req, res) => {
  res.json(readJSON(GALLERY_FILE).map(normalizeItem));
});

app.post('/api/gallery', requireAdmin, upload.array('images', 8), (req, res) => {
  const { alt, caption, seasonal, price, sku } = req.body;
  if (!alt || !req.files || !req.files.length) {
    return res.status(400).json({ ok: false, error: 'Name and at least one photo are required.' });
  }
  const items = readJSON(GALLERY_FILE);
  const images = req.files.map(f => '/uploads/' + f.filename);
  const newItem = {
    id: 'item-' + Date.now(),
    images,
    src: images[0],
    alt,
    caption: caption || '',
    seasonal: seasonal === 'true' || seasonal === true,
    price: formatPrice(price),
    sku: sku || ''
  };
  items.unshift(newItem);
  writeJSON(GALLERY_FILE, items);
  res.json({ ok: true, item: newItem });
});

app.put('/api/gallery/:id', requireAdmin, upload.array('images', 8), (req, res) => {
  const items = readJSON(GALLERY_FILE);
  const idx = items.findIndex(it => it.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Item not found' });

  const old = normalizeItem(items[idx]);
  const { alt, caption, seasonal, price, sku, keepImages } = req.body;

  // `keepImages` is a JSON array of image URLs the admin panel wants to keep
  // (existing photos the user didn't remove). If it's not sent at all
  // (e.g. a quick price-only edit), every existing photo is kept untouched.
  let keep = old.images;
  if (keepImages !== undefined) {
    try {
      const parsed = JSON.parse(keepImages);
      if (Array.isArray(parsed)) keep = parsed;
    } catch (e) { /* malformed — fall back to keeping everything */ }
  }

  const newFiles = (req.files || []).map(f => '/uploads/' + f.filename);
  const finalImages = keep.concat(newFiles).slice(0, 8);

  if (finalImages.length === 0) {
    return res.status(400).json({ ok: false, error: 'At least one photo is required.' });
  }

  // delete any local uploaded photos that got dropped from the "keep" list
  old.images.filter(src => !finalImages.includes(src)).forEach(src => {
    if (src.startsWith('/uploads/')) {
      fs.unlink(path.join(UPLOADS_DIR, path.basename(src)), () => {});
    }
  });

  const updated = {
    ...old,
    alt: alt || old.alt,
    caption: caption !== undefined ? caption : old.caption,
    seasonal: seasonal === 'true' || seasonal === true,
    price: price !== undefined ? formatPrice(price) : (old.price || ''),
    sku: sku !== undefined ? sku : (old.sku || ''),
    images: finalImages,
    src: finalImages[0]
  };

  items[idx] = updated;
  writeJSON(GALLERY_FILE, items);
  res.json({ ok: true, item: updated });
});

app.delete('/api/gallery/:id', requireAdmin, (req, res) => {
  const items = readJSON(GALLERY_FILE);
  const idx = items.findIndex(it => it.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Item not found' });

  const [removed] = items.splice(idx, 1);
  const images = Array.isArray(removed.images) && removed.images.length ? removed.images : (removed.src ? [removed.src] : []);
  images.forEach(src => {
    if (src.startsWith('/uploads/')) {
      fs.unlink(path.join(UPLOADS_DIR, path.basename(src)), () => {});
    }
  });
  writeJSON(GALLERY_FILE, items);
  res.json({ ok: true });
});

/* ================= BACKUP / RESTORE ================= */

app.get('/api/backup', requireAdmin, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="my-back-shed-gallery-backup.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(fs.readFileSync(GALLERY_FILE, 'utf8'));
});

app.post('/api/restore', requireAdmin, express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  try {
    const parsed = JSON.parse(req.body);
    if (!Array.isArray(parsed)) throw new Error('Backup file must contain an array');
    writeJSON(GALLERY_FILE, parsed);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'That file could not be read as a gallery backup.' });
  }
});

/* ================= PAGES (About Us now; other nav pages later reuse this) ================= */

app.get('/api/pages/:slug', (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  res.json(page);
});

app.put('/api/pages/:slug', requireAdmin, (req, res) => {
  const pages = readJSON(PAGES_FILE);
  if (!pages[req.params.slug]) return res.status(404).json({ ok: false, error: 'Page not found' });
  const { hero, sections, faqs } = req.body;
  if (hero) pages[req.params.slug].hero = hero;
  if (Array.isArray(sections)) pages[req.params.slug].sections = sections;
  if (Array.isArray(faqs)) pages[req.params.slug].faqs = faqs;
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, page: pages[req.params.slug] });
});

app.post('/api/pages/:slug/photos', requireAdmin, upload.array('photos', 12), (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const newUrls = (req.files || []).map(f => '/uploads/' + f.filename);
  page.photos = (page.photos || []).concat(newUrls);
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, photos: page.photos });
});

app.delete('/api/pages/:slug/photos', requireAdmin, (req, res) => {
  const { src } = req.body;
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  page.photos = (page.photos || []).filter(p => p !== src);
  if (src && src.startsWith('/uploads/')) fs.unlink(path.join(UPLOADS_DIR, path.basename(src)), () => {});
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, photos: page.photos });
});

app.post('/api/pages/:slug/team', requireAdmin, upload.single('photo'), (req, res) => {
  const { name, role, bio } = req.body;
  if (!name) return res.status(400).json({ ok: false, error: 'Name is required.' });
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const member = {
    id: 'team-' + Date.now(),
    name, role: role || '', bio: bio || '',
    photo: req.file ? '/uploads/' + req.file.filename : ''
  };
  page.team = page.team || [];
  page.team.push(member);
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, member });
});

app.put('/api/pages/:slug/team/:memberId', requireAdmin, upload.single('photo'), (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const idx = (page.team || []).findIndex(m => m.id === req.params.memberId);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Team member not found' });
  const { name, role, bio } = req.body;
  const old = page.team[idx];
  const updated = { ...old, name: name || old.name, role: role !== undefined ? role : old.role, bio: bio !== undefined ? bio : old.bio };
  if (req.file) {
    if (old.photo && old.photo.startsWith('/uploads/')) fs.unlink(path.join(UPLOADS_DIR, path.basename(old.photo)), () => {});
    updated.photo = '/uploads/' + req.file.filename;
  }
  page.team[idx] = updated;
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, member: updated });
});

app.delete('/api/pages/:slug/team/:memberId', requireAdmin, (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const idx = (page.team || []).findIndex(m => m.id === req.params.memberId);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Team member not found' });
  const [removed] = page.team.splice(idx, 1);
  if (removed.photo && removed.photo.startsWith('/uploads/')) fs.unlink(path.join(UPLOADS_DIR, path.basename(removed.photo)), () => {});
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true });
});

// before/after transformation pairs (services page)
app.post('/api/pages/:slug/transformations', requireAdmin, upload.fields([{ name: 'before', maxCount: 1 }, { name: 'after', maxCount: 1 }]), (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  if (!req.files || !req.files.before || !req.files.after) {
    return res.status(400).json({ ok: false, error: 'Both a before and an after photo are required.' });
  }
  const item = {
    id: 'trans-' + Date.now(),
    before: '/uploads/' + req.files.before[0].filename,
    after: '/uploads/' + req.files.after[0].filename,
    label: req.body.label || ''
  };
  page.transformations = page.transformations || [];
  page.transformations.push(item);
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, item });
});

app.delete('/api/pages/:slug/transformations/:id', requireAdmin, (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const idx = (page.transformations || []).findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' });
  const [removed] = page.transformations.splice(idx, 1);
  [removed.before, removed.after].forEach(src => {
    if (src && src.startsWith('/uploads/')) fs.unlink(path.join(UPLOADS_DIR, path.basename(src)), () => {});
  });
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true });
});

// fabric/material swatches (services page)
app.post('/api/pages/:slug/swatches', requireAdmin, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'A photo is required.' });
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const item = { id: 'swatch-' + Date.now(), src: '/uploads/' + req.file.filename, label: req.body.label || '' };
  page.swatches = page.swatches || [];
  page.swatches.push(item);
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, item });
});

app.delete('/api/pages/:slug/swatches/:id', requireAdmin, (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const idx = (page.swatches || []).findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' });
  const [removed] = page.swatches.splice(idx, 1);
  if (removed.src && removed.src.startsWith('/uploads/')) fs.unlink(path.join(UPLOADS_DIR, path.basename(removed.src)), () => {});
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true });
});

// homepage craft-scroll marquee images (services page)
app.post('/api/pages/:slug/craftTiles', requireAdmin, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'A photo is required.' });
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const item = { id: 'craft-' + Date.now(), src: '/uploads/' + req.file.filename, label: req.body.label || '' };
  page.craftTiles = page.craftTiles || [];
  page.craftTiles.push(item);
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true, item });
});

app.delete('/api/pages/:slug/craftTiles/:id', requireAdmin, (req, res) => {
  const pages = readJSON(PAGES_FILE);
  const page = pages[req.params.slug];
  if (!page) return res.status(404).json({ ok: false, error: 'Page not found' });
  const idx = (page.craftTiles || []).findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' });
  const [removed] = page.craftTiles.splice(idx, 1);
  if (removed.src && removed.src.startsWith('/uploads/')) fs.unlink(path.join(UPLOADS_DIR, path.basename(removed.src)), () => {});
  writeJSON(PAGES_FILE, pages);
  res.json({ ok: true });
});

/* ================= QUOTE REQUESTS ================= */

app.post('/api/quote-requests', (req, res) => {
  const { name, email, phone, projectType, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Name, email, and a project description are required.' });
  }
  const quotes = readJSON(QUOTES_FILE);
  const quote = {
    id: 'quote-' + Date.now(),
    name, email, phone: phone || '', projectType: projectType || '', message,
    createdAt: new Date().toISOString()
  };
  quotes.unshift(quote);
  writeJSON(QUOTES_FILE, quotes);
  res.json({ ok: true });
});

app.get('/api/quote-requests', requireAdmin, (req, res) => {
  res.json(readJSON(QUOTES_FILE));
});

app.delete('/api/quote-requests/:id', requireAdmin, (req, res) => {
  const quotes = readJSON(QUOTES_FILE);
  const idx = quotes.findIndex(q => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' });
  quotes.splice(idx, 1);
  writeJSON(QUOTES_FILE, quotes);
  res.json({ ok: true });
});

/* ================= COMMERCE (Shopify / WooCommerce extension point) ================= */

app.get('/api/commerce/status', (req, res) => {
  res.json({ provider: commerce.PROVIDER, connected: commerce.isConnected() });
});

/* ================= INSTAGRAM ================= */

// Kicks off the one-time connect flow — only needs to be run once (until the
// business owner ever wants to reconnect, e.g. after revoking access).
app.get('/auth/instagram', requireAdmin, (req, res) => {
  if (!IG_APP_ID || !IG_APP_SECRET) {
    return res.status(400).send('IG_APP_ID and IG_APP_SECRET are not set in .env yet — see README.md, "Connecting Instagram" section.');
  }
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/instagram/callback`;
  const authUrl = `https://api.instagram.com/oauth/authorize` +
    `?client_id=${encodeURIComponent(IG_APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(IG_SCOPE)}` +
    `&response_type=code`;
  res.redirect(authUrl);
});

app.get('/auth/instagram/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) {
    return res.status(400).send(`Instagram declined the connection: ${error_description || error}`);
  }
  if (!code) return res.status(400).send('No authorization code returned from Instagram.');

  try {
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/instagram/callback`;
    // Step 1: exchange the authorization code for a short-lived token
    const form = new URLSearchParams({
      client_id: IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code
    });
    const shortResp = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    const shortJson = await shortResp.json();
    if (!shortJson.access_token) {
      console.error('[instagram] short-lived token exchange failed:', shortJson);
      return res.status(400).send('Could not get a short-lived token from Instagram. Check the server console for details.');
    }

    // Step 2: exchange the short-lived token for a long-lived (~60 day) token
    const longUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(IG_APP_SECRET)}&access_token=${encodeURIComponent(shortJson.access_token)}`;
    const longResp = await fetch(longUrl);
    const longJson = await longResp.json();
    if (!longJson.access_token) {
      console.error('[instagram] long-lived token exchange failed:', longJson);
      return res.status(400).send('Got a short-lived token but could not upgrade it to a long-lived one. Check the server console.');
    }

    saveIgToken(longJson.access_token, longJson.expires_in);
    res.send('<h2 style="font-family:sans-serif;">✅ Instagram connected!</h2><p style="font-family:sans-serif;">You can close this tab and go back to the admin dashboard.</p>');
  } catch (err) {
    console.error('[instagram] callback error:', err);
    res.status(500).send('Something went wrong connecting Instagram. Check the server console.');
  }
});

app.get('/api/instagram/connection', (req, res) => {
  const token = getStoredIgToken();
  res.json({ connected: !!(token && token.accessToken), configuredApp: !!(IG_APP_ID && IG_APP_SECRET) });
});

app.post('/api/instagram/disconnect', requireAdmin, (req, res) => {
  if (fs.existsSync(IG_TOKEN_FILE)) fs.unlinkSync(IG_TOKEN_FILE);
  igPostsCache = { data: null, fetchedAt: 0 };
  res.json({ ok: true });
});

app.get('/api/instagram', async (req, res) => {
  const token = getStoredIgToken();
  if (!token || !token.accessToken) {
    return res.json({ configured: false, posts: [] });
  }

  if (igPostsCache.data && Date.now() - igPostsCache.fetchedAt < IG_CACHE_TTL_MS) {
    return res.json({ configured: true, posts: igPostsCache.data });
  }

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const url = `${IG_HOST}/me/media?fields=${fields}&limit=12&access_token=${encodeURIComponent(token.accessToken)}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if (!json.data) {
      console.warn('[instagram] unexpected response fetching media:', json);
      return res.json({ configured: true, posts: igPostsCache.data || [] });
    }
    const posts = json.data.map(p => ({
      id: p.id,
      caption: p.caption || '',
      mediaUrl: p.media_type === 'VIDEO' ? (p.thumbnail_url || p.media_url) : p.media_url,
      permalink: p.permalink,
      timestamp: p.timestamp
    }));
    igPostsCache = { data: posts, fetchedAt: Date.now() };
    res.json({ configured: true, posts });
  } catch (err) {
    console.error('[instagram] fetch error:', err);
    res.json({ configured: true, posts: igPostsCache.data || [] });
  }
});

/* ================= error handling ================= */

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only image files are allowed') {
    return res.status(400).json({ ok: false, error: err.message });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`My Back Shed server running at http://localhost:${PORT}`);
  refreshIgTokenIfDue();
  setInterval(refreshIgTokenIfDue, 24 * 60 * 60 * 1000); // check once a day
});
