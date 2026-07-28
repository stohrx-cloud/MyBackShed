/* =====================================================================
   My Back Shed — shared front-end behaviors (fully static build)

   This site now needs NO server/backend to run — every page works by
   opening the .html files directly (or from any plain static host).
   All gallery items, page content (About/Services), settings, and quote
   requests live in this browser's localStorage under the "mbs_*" keys
   below. Photos are stored as base64 data URLs, so there is no uploads
   folder to manage.

   IMPORTANT — what that means in practice:
   • Everything an editor adds in the Staff Admin panel is saved only in
     THAT browser/device. Use "Download Backup" regularly and keep the
     file somewhere safe; "Restore From Backup" loads it back in (on
     this or any other browser).
   • The Staff Admin password gate is enforced in the browser, not on a
     server — it's a "keep casual visitors out" door, not a vault. See
     the note on the login screen.
   • Instagram's live feed and any real payment/checkout integration
     need a real backend to talk to those APIs securely, so this build
     always shows the curated fallback tiles / "coming soon" messaging
     for those two features. Everything else (gallery, shop, about,
     services, quotes, admin) is fully live and editable.
   ===================================================================== */

/* ---------------------------------------------------------------------
   STORE — all persisted data, localStorage-backed
   --------------------------------------------------------------------- */
const Store = (function(){
  const KEYS = {
    gallery:  'mbs_gallery_items',
    settings: 'mbs_settings',
    pages:    'mbs_pages',
    quotes:   'mbs_quote_requests'
  };

  function read(key, fallback){
    const raw = localStorage.getItem(key);
    if(raw === null) return fallback;
    try{ return JSON.parse(raw); } catch(e){ return fallback; }
  }
  function write(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

  function uid(prefix){
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  }

  const seedGallery = [
    { id:'seed-1', images:['https://images.unsplash.com/photo-1519710164239-da123dc03ef4?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src:'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt:'Painted French Armoire', caption:'Hand-painted armoire in soft sage, one of a kind.', price:'$680', sku:'', seasonal:true },
    { id:'seed-2', images:['https://images.unsplash.com/photo-1567016432779-094069958ea5?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src:'https://images.unsplash.com/photo-1567016432779-094069958ea5?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt:'Antique Wing Chair', caption:'Reupholstered wing chair in vintage linen.', price:'$340', sku:'', seasonal:false },
    { id:'seed-3', images:['https://images.unsplash.com/photo-1503602642458-232111445657?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src:'https://images.unsplash.com/photo-1503602642458-232111445657?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt:'Farmhouse Dining Table', caption:'Reclaimed oak farmhouse table, hand-waxed finish.', price:'$920', sku:'', seasonal:true },
    { id:'seed-4', images:['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src:'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt:'Vintage Brass Mirror', caption:'Circa 1920s brass mirror, fully restored.', price:'$210', sku:'', seasonal:false },
    { id:'seed-5', images:['https://images.unsplash.com/photo-1616627561839-074385245ff6?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src:'https://images.unsplash.com/photo-1616627561839-074385245ff6?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt:'Painted Console Table', caption:'Distressed console in antique white.', price:'$460', sku:'', seasonal:true },
    { id:'seed-6', images:['https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?fm=jpg&q=80&w=1200&fit=crop&auto=format'], src:'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?fm=jpg&q=80&w=1200&fit=crop&auto=format', alt:'Cottage Bedroom Corner', caption:'French cottage styling, ready for your space.', price:'', sku:'', seasonal:false }
  ];

  const seedSettings = { seasonalEnabled: true };

  const seedPages = {
    about: {
      hero: {
        eyebrow: 'Our Story',
        title: 'A Passion for Second Chances',
        intro: 'My Back Shed started in 2001 as a small collection of estate-sale finds. Today it\u2019s a Kerr Street boutique built on the same idea: every piece deserves one more beautiful chapter.'
      },
      sections: [
        { id:'history', heading:'Where It Started', body:'What began as weekend trips to auctions and estate sales grew into a full boutique on Kerr Street. Owner Lisa Barsony has spent over two decades sourcing pieces with real character \u2014 antiques, one-of-a-kind furniture, and everyday objects with a story \u2014 and giving them a second life.' },
        { id:'craft', heading:'Hand-Painted, In-House', body:'What sets My Back Shed apart is what happens after a piece comes through the door. Our in-house team hand-paints, refinishes, and reupholsters everything on-site, so no two pieces (and no two customers\u2019 requests) are treated the same way.' },
        { id:'philosophy', heading:'Our Philosophy', body:'We believe a home should feel collected, not decorated overnight. Every piece we carry is chosen because it has something to say \u2014 and we love nothing more than helping a customer find the one that says it for them.' }
      ],
      photos: [
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?fm=jpg&q=75&w=900&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1721119211162-2c3f2809d190?fm=jpg&q=75&w=900&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1511389026070-a14ae610a1be?fm=jpg&q=75&w=900&fit=crop&auto=format'
      ],
      team: [
        { id:'team-1', name:'Lisa Barsony', role:'Owner & Founder', bio:'Finding the perfect piece for a customer is always exciting \u2014 it\u2019s why Lisa started My Back Shed back in 2001, and why she still hand-picks every piece in the shop.', photo:'' }
      ]
    },
    services: {
      hero: {
        eyebrow: 'Made By Hand, In-House',
        title: 'Upholstery & Custom Painting',
        intro: 'Bring us your piece \u2014 tired, dated, or just not quite right \u2014 and our in-house team will bring it back to life, start to finish.'
      },
      sections: [
        { id:'upholstery', heading:'Upholstery', body:'From a single accent chair to a full living-room suite, our team strips, repairs, and reupholsters furniture using a full library of fabrics (or your own). Every job includes structural repairs where needed, not just a new fabric on top.' },
        { id:'painting', heading:'Custom Painting', body:'Hand-painted, distressed, or fully refinished \u2014 we work in any furniture-safe finish to match your space, from soft French-country neutrals to bold statement colors.' }
      ],
      transformations: [],
      swatches: [],
      faqs: [
        { id:'faq-1', question:'How long does a typical project take?', answer:'Most single pieces (a chair, a small table) take 2\u20133 weeks depending on fabric availability. Larger projects like sofas or multi-piece sets can take 4\u20136 weeks. We\u2019ll give you a firm estimate at consultation.' },
        { id:'faq-2', question:'Can I supply my own fabric?', answer:'Yes \u2014 customer-supplied fabric (COM) is always welcome. Just let us know at consultation so we can confirm yardage needed.' },
        { id:'faq-3', question:'Do you offer pickup and delivery?', answer:'We offer local delivery within Oakville for an additional fee, or you\u2019re welcome to drop off and collect your piece at the Kerr Street shop.' },
        { id:'faq-4', question:'What if my piece needs structural repair, not just a new finish?', answer:'No problem \u2014 our team handles frame repairs, re-gluing, and reinforcement as part of the same visit, so your piece is solid as well as beautiful.' }
      ]
    }
  };

  function ensureSeeded(){
    if(localStorage.getItem(KEYS.gallery) === null) write(KEYS.gallery, seedGallery);
    if(localStorage.getItem(KEYS.settings) === null) write(KEYS.settings, seedSettings);
    if(localStorage.getItem(KEYS.pages) === null) write(KEYS.pages, seedPages);
    if(localStorage.getItem(KEYS.quotes) === null) write(KEYS.quotes, []);
  }
  ensureSeeded();

  return {
    uid,
    gallery: {
      getItems(){ return read(KEYS.gallery, []); },
      saveItems(items){ write(KEYS.gallery, items); }
    },
    settings: {
      get(){ return read(KEYS.settings, seedSettings); },
      save(next){ write(KEYS.settings, next); }
    },
    pages: {
      getAll(){ return read(KEYS.pages, seedPages); },
      get(slug){ return this.getAll()[slug] || null; },
      save(slug, page){
        const all = this.getAll();
        all[slug] = page;
        write(KEYS.pages, all);
      },
      saveAll(all){ write(KEYS.pages, all); }
    },
    quotes: {
      getAll(){ return read(KEYS.quotes, []); },
      saveAll(list){ write(KEYS.quotes, list); },
      remove(id){ this.saveAll(this.getAll().filter(q => q.id !== id)); }
    }
  };
})();

/* ---------------------------------------------------------------------
   file helpers — File objects → base64 data URLs
   --------------------------------------------------------------------- */
function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function filesToDataURLs(files){
  return Promise.all(Array.from(files || []).filter(Boolean).map(fileToDataURL));
}
function formatPrice(raw){
  const val = (raw || '').trim();
  if(!val) return '';
  return /^[$€£]/.test(val) ? val : ('$' + val);
}

/* =====================================================================
   ADMIN AUTH — hashed-in-name-only password + attempt lockout + session flag.
   IMPORTANT: this is a client-side gate only. It keeps casual visitors
   out of the admin page, but anyone who opens the browser dev tools can
   read this code and the stored data — there is no real server enforcing
   anything. Treat it as a "staff door," not a vault.
   ===================================================================== */
const AdminAuth = (function(){
  const HASH_KEY = 'mbs_admin_pw_hash';
  const FAIL_KEY = 'mbs_admin_fail_count';
  const LOCK_KEY = 'mbs_admin_lock_until';
  const SESSION_KEY = 'mbs_admin_session';
  const DEFAULT_PW = 'MyBackShed2026!';
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 30000;

  async function sha256(str){
    // crypto.subtle requires a secure context (https:// or localhost) and
    // throws on file://, which breaks this when a page is just double-
    // clicked open. Use it when available; fall back to a plain compare
    // (still a client-side-only gate either way — see the note above).
    try{
      if(window.crypto && window.crypto.subtle && window.isSecureContext){
        const enc = new TextEncoder().encode(str);
        const buf = await window.crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    }catch(e){ /* fall through to plain compare */ }
    return 'plain:' + str;
  }

  async function ensureSeeded(){
    if(!localStorage.getItem(HASH_KEY)){
      localStorage.setItem(HASH_KEY, await sha256(DEFAULT_PW));
    }
  }

  async function verify(pw){
    await ensureSeeded();
    return (await sha256(pw)) === localStorage.getItem(HASH_KEY);
  }

  async function setPassword(pw){
    localStorage.setItem(HASH_KEY, await sha256(pw));
  }

  function isLockedOut(){ return Date.now() < parseInt(localStorage.getItem(LOCK_KEY) || '0', 10); }
  function lockoutRemaining(){ return Math.max(0, Math.ceil((parseInt(localStorage.getItem(LOCK_KEY) || '0', 10) - Date.now()) / 1000)); }

  function recordFail(){
    const count = parseInt(localStorage.getItem(FAIL_KEY) || '0', 10) + 1;
    if(count >= MAX_ATTEMPTS){
      localStorage.setItem(LOCK_KEY, String(Date.now() + LOCKOUT_MS));
      localStorage.setItem(FAIL_KEY, '0');
    } else {
      localStorage.setItem(FAIL_KEY, String(count));
    }
    return MAX_ATTEMPTS - count;
  }

  function recordSuccess(){ localStorage.setItem(FAIL_KEY, '0'); }
  function isLoggedIn(){ return sessionStorage.getItem(SESSION_KEY) === 'true'; }
  function login(){ sessionStorage.setItem(SESSION_KEY, 'true'); }
  function logout(){ sessionStorage.removeItem(SESSION_KEY); }

  return { verify, setPassword, isLockedOut, lockoutRemaining, recordFail, recordSuccess, isLoggedIn, login, logout, DEFAULT_PW };
})();

/* ---------------------------------------------------------------------
   API — same method names/shapes the rest of this file already expects,
   now backed by Store/localStorage instead of an Express server.
   --------------------------------------------------------------------- */
const Api = {
  async getGallery(){ return Store.gallery.getItems(); },
  async getSettings(){ return Store.settings.get(); },
  async setSeasonalEnabled(val){
    const settings = Object.assign({}, Store.settings.get(), { seasonalEnabled: val });
    Store.settings.save(settings);
    return settings;
  },
  async getSession(){ return { loggedIn: AdminAuth.isLoggedIn() }; },
  async login(password){
    if(AdminAuth.isLockedOut()){
      return { status:429, data:{ ok:false, error:`Too many attempts. Try again in ${AdminAuth.lockoutRemaining()}s.` } };
    }
    const ok = await AdminAuth.verify(password);
    if(ok){
      AdminAuth.recordSuccess();
      AdminAuth.login();
      return { status:200, data:{ ok:true } };
    }
    const remaining = AdminAuth.recordFail();
    return { status:401, data:{ ok:false, error: remaining > 0 ? `Incorrect password. ${remaining} attempt(s) left.` : 'Too many attempts. Try again in 30s.' } };
  },
  async logout(){ AdminAuth.logout(); return { ok:true }; },
  async changePassword(currentPassword, newPassword){
    const ok = await AdminAuth.verify(currentPassword);
    if(!ok) return { status:401, data:{ ok:false, error:'Current password is incorrect.' } };
    if((newPassword || '').length < 8) return { status:400, data:{ ok:false, error:'New password should be at least 8 characters.' } };
    await AdminAuth.setPassword(newPassword);
    return { status:200, data:{ ok:true } };
  },

  async addItem(formData){
    const newDataUrls = await filesToDataURLs(formData.getAll('images'));
    if(!newDataUrls.length){
      return { status:400, data:{ ok:false, error:'Add at least one photo.' } };
    }
    const item = {
      id: Store.uid('item'),
      images: newDataUrls,
      src: newDataUrls[0],
      alt: (formData.get('alt') || '').trim(),
      caption: (formData.get('caption') || '').trim(),
      price: formatPrice(formData.get('price')),
      sku: (formData.get('sku') || '').trim(),
      seasonal: formData.get('seasonal') === 'true'
    };
    const items = Store.gallery.getItems();
    items.unshift(item);
    Store.gallery.saveItems(items);
    return { status:200, data:{ ok:true, item } };
  },

  async updateItem(id, formData){
    const items = Store.gallery.getItems();
    const idx = items.findIndex(it => it.id === id);
    if(idx === -1) return { status:404, data:{ ok:false, error:'That piece could not be found.' } };
    const existing = items[idx];
    const patch = {};
    if(formData.has('alt')) patch.alt = (formData.get('alt') || '').trim();
    if(formData.has('caption')) patch.caption = (formData.get('caption') || '').trim();
    if(formData.has('seasonal')) patch.seasonal = formData.get('seasonal') === 'true';
    if(formData.has('price')) patch.price = formatPrice(formData.get('price'));
    if(formData.has('sku')) patch.sku = (formData.get('sku') || '').trim();

    let images = (existing.images && existing.images.length) ? existing.images.slice() : (existing.src ? [existing.src] : []);
    if(formData.has('keepImages')){
      try{ images = JSON.parse(formData.get('keepImages')); } catch(e){ /* keep prior value */ }
    }
    const newFiles = formData.getAll('images');
    if(newFiles.length){
      images = images.concat(await filesToDataURLs(newFiles));
    }
    if(images.length){ patch.images = images; patch.src = images[0]; }

    items[idx] = Object.assign({}, existing, patch);
    Store.gallery.saveItems(items);
    return { status:200, data:{ ok:true, item: items[idx] } };
  },

  async deleteItem(id){
    Store.gallery.saveItems(Store.gallery.getItems().filter(it => it.id !== id));
    return { status:200, data:{ ok:true } };
  },

  async restore(jsonText){
    try{
      const parsed = JSON.parse(jsonText);
      if(Array.isArray(parsed)){
        Store.gallery.saveItems(parsed); // legacy gallery-only backup
      } else if(parsed && typeof parsed === 'object'){
        if(Array.isArray(parsed.gallery)) Store.gallery.saveItems(parsed.gallery);
        if(parsed.settings) Store.settings.save(parsed.settings);
        if(parsed.pages) Store.pages.saveAll(parsed.pages);
        if(Array.isArray(parsed.quotes)) Store.quotes.saveAll(parsed.quotes);
      } else {
        throw new Error('Unrecognized backup format.');
      }
      return { status:200, data:{ ok:true } };
    } catch(err){
      return { status:400, data:{ ok:false, error:'That file could not be read as a backup.' } };
    }
  },

  async getPage(slug){
    const page = Store.pages.get(slug);
    if(!page) throw new Error(`Could not load the "${slug}" page.`);
    return page;
  },
  async savePageContent(slug, payload){
    const page = Store.pages.get(slug);
    if(!page) return { status:404, data:{ ok:false, error:'Page not found.' } };
    page.hero = payload.hero;
    page.sections = payload.sections;
    if(payload.faqs) page.faqs = payload.faqs;
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true } };
  },
  async addPagePhotos(slug, formData){
    const page = Store.pages.get(slug);
    const urls = await filesToDataURLs(formData.getAll('photos'));
    page.photos = (page.photos || []).concat(urls);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true, photos: page.photos } };
  },
  async removePagePhoto(slug, src){
    const page = Store.pages.get(slug);
    page.photos = (page.photos || []).filter(p => p !== src);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true, photos: page.photos } };
  },
  async addTeamMember(slug, formData){
    const page = Store.pages.get(slug);
    const files = formData.getAll('photo');
    const photo = files.length ? (await filesToDataURLs(files))[0] : '';
    const member = { id: Store.uid('team'), name:(formData.get('name')||'').trim(), role:(formData.get('role')||'').trim(), bio:(formData.get('bio')||'').trim(), photo };
    page.team = (page.team || []).concat(member);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true, member } };
  },
  async updateTeamMember(slug, id, formData){
    const page = Store.pages.get(slug);
    const idx = (page.team || []).findIndex(m => m.id === id);
    if(idx === -1) return { status:404, data:{ ok:false, error:'Team member not found.' } };
    const existing = page.team[idx];
    const files = formData.getAll('photo');
    const photo = files.length ? (await filesToDataURLs(files))[0] : existing.photo;
    page.team[idx] = { id, name:(formData.get('name')||'').trim(), role:(formData.get('role')||'').trim(), bio:(formData.get('bio')||'').trim(), photo };
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true, member: page.team[idx] } };
  },
  async removeTeamMember(slug, id){
    const page = Store.pages.get(slug);
    page.team = (page.team || []).filter(m => m.id !== id);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true } };
  },
  async addTransformation(slug, formData){
    const page = Store.pages.get(slug);
    const [before, after] = await filesToDataURLs([formData.get('before'), formData.get('after')]);
    const item = { id: Store.uid('trans'), before, after, label:(formData.get('label')||'').trim() };
    page.transformations = (page.transformations || []).concat(item);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true, item } };
  },
  async removeTransformation(slug, id){
    const page = Store.pages.get(slug);
    page.transformations = (page.transformations || []).filter(t => t.id !== id);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true } };
  },
  async addSwatch(slug, formData){
    const page = Store.pages.get(slug);
    const files = formData.getAll('photo');
    const src = files.length ? (await filesToDataURLs(files))[0] : '';
    const item = { id: Store.uid('swatch'), src, label:(formData.get('label')||'').trim() };
    page.swatches = (page.swatches || []).concat(item);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true, item } };
  },
  async removeSwatch(slug, id){
    const page = Store.pages.get(slug);
    page.swatches = (page.swatches || []).filter(s => s.id !== id);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true } };
  },
  async addCraftTile(slug, formData){
    const page = Store.pages.get(slug);
    const files = formData.getAll('photo');
    const src = files.length ? (await filesToDataURLs(files))[0] : '';
    const item = { id: Store.uid('tile'), src, label:(formData.get('label')||'').trim() };
    page.craftTiles = (page.craftTiles || []).concat(item);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true, item } };
  },
  async removeCraftTile(slug, id){
    const page = Store.pages.get(slug);
    page.craftTiles = (page.craftTiles || []).filter(t => t.id !== id);
    Store.pages.save(slug, page);
    return { status:200, data:{ ok:true } };
  },

  async getQuoteRequests(){ return Store.quotes.getAll(); },
  async submitQuoteRequest(payload){
    if(!payload.name || !payload.email || !payload.message){
      return { status:400, data:{ ok:false, error:'Please fill in your name, email, and a message.' } };
    }
    const record = Object.assign({ id: Store.uid('quote'), createdAt: new Date().toISOString() }, payload);
    const quotes = Store.quotes.getAll();
    quotes.unshift(record);
    Store.quotes.saveAll(quotes);
    return { status:200, data:{ ok:true } };
  },
  async deleteQuoteRequest(id){
    Store.quotes.remove(id);
    return { status:200, data:{ ok:true } };
  }
};

/* ---------------- reveal on scroll (shared across pages) ---------------- */
function initReveal(){
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:0.12 });
  els.forEach(el=>io.observe(el));
}

function jumpToGalleryItem(id){
  const card = document.getElementById(id);
  if(!card) return;
  card.scrollIntoView({ behavior:'smooth', block:'center' });
  card.classList.add('highlight');
  setTimeout(()=>card.classList.remove('highlight'), 2600);
}

/* ---------------- lazy-load background photos (any [data-bg] element, any page) ---------------- */
function initLazyBackgrounds(){
  const lazyBgEls = document.querySelectorAll('[data-bg]');
  if(!lazyBgEls.length) return;
  const bgObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const el = entry.target;
        el.style.backgroundImage = `url('${el.dataset.bg}')`;
        el.removeAttribute('data-bg');
        bgObserver.unobserve(el);
      }
    });
  }, { rootMargin: '600px 0px' });
  lazyBgEls.forEach(el=>bgObserver.observe(el));
}

/* ---------------- parallax banners (.parallax-bg, any page) ---------------- */
function initParallax(){
  const parallaxEls = document.querySelectorAll('.parallax-bg');
  if(!parallaxEls.length) return;
  function parallaxLoop(){
    parallaxEls.forEach(el=>{
      const rect = el.parentElement.getBoundingClientRect();
      const offset = Math.max(-140, Math.min(140, rect.top * 0.3));
      el.style.transform = `translateY(${offset}px)`;
    });
    requestAnimationFrame(parallaxLoop);
  }
  requestAnimationFrame(parallaxLoop);
}

/* ---------------- simple hero background crossfade (homepage) ---------------- */
function initHeroSlideshow(){
  const slides = document.querySelectorAll('.hero .slide');
  if(!slides.length) return;
  let slideIndex = 0;
  function showSlide(i){
    slides.forEach(s=>s.classList.remove('active'));
    slides[i].classList.add('active');
  }
  setInterval(()=>{
    slideIndex = (slideIndex+1) % slides.length;
    showSlide(slideIndex);
  }, 4200);
}

/* ---------------- seasonal updates banner (togglable, all pages) ----------------
   The ✕ only dismisses the banner for this browser tab/session — the actual
   on/off switch (affecting every visitor of this browser/device) lives on
   the admin dashboard. */
async function initSeasonalBanner(){
  const banner = document.getElementById('seasonalBanner');
  if(!banner) return;
  const track = document.getElementById('seasonalTrack');
  const DISMISS_KEY = 'mbs_banner_dismissed_session';

  async function render(){
    if(sessionStorage.getItem(DISMISS_KEY) === '1'){
      banner.classList.add('hidden');
      return;
    }
    const settings = await Api.getSettings();
    if(!settings.seasonalEnabled){
      banner.classList.add('hidden');
      return;
    }
    const items = (await Api.getGallery()).filter(it=>it.seasonal);
    if(!items.length){ banner.classList.add('hidden'); return; }

    banner.classList.remove('hidden');
    track.innerHTML = items.map(it => `
      <div class="seasonal-item" data-id="${it.id}">
        <img src="${it.src}" alt="${it.alt}">
        <span>${it.alt}</span>
      </div>
    `).join('');
    track.querySelectorAll('.seasonal-item').forEach(el=>{
      el.addEventListener('click', ()=>{
        const id = el.dataset.id;
        if(/gallery\.html/.test(location.pathname)) jumpToGalleryItem(id);
        else window.location.href = 'gallery.html#' + id;
      });
    });
  }

  render();
  const closeBtn = document.getElementById('seasonalClose');
  if(closeBtn) closeBtn.addEventListener('click', ()=>{
    sessionStorage.setItem(DISMISS_KEY, '1');
    banner.classList.add('hidden');
  });
}

/* ---------------- read-only grid renderer (gallery.html + shop.html list view) ---------------- */
async function renderReadOnlyGallery(containerId){
  const grid = document.getElementById(containerId);
  if(!grid) return;
  const items = await Api.getGallery();
  grid.innerHTML = items.length ? items.map(it => `
    <a class="gallery-card" id="${it.id}" href="shop.html?item=${it.id}">
      <div class="g-img" style="background-image:url('${it.src}')">
        ${it.seasonal ? '<span class="seasonal-tag">Seasonal</span>' : ''}
        ${(it.images && it.images.length > 1) ? `<span class="photo-count-tag">📷 ${it.images.length}</span>` : ''}
      </div>
      <div class="g-body">
        <h4 class="slab">${it.alt}</h4>
        <p>${it.caption}</p>
        ${it.price ? `<p style="font-weight:700; color:var(--blush-line); margin-top:6px;">Price Estimate: ${it.price}</p>` : ''}
      </div>
    </a>
  `).join('') : `<div class="gallery-empty">No pieces yet — check back soon.</div>`;

  if(location.hash){
    const id = location.hash.replace('#','');
    setTimeout(()=>jumpToGalleryItem(id), 150);
  }
}

/* ---------------- shop page: list view + single-product detail view ---------------- */
async function initShopPage(){
  const grid = document.getElementById('shopGrid');
  const detail = document.getElementById('productDetail');
  if(!grid || !detail) return;

  const itemId = new URLSearchParams(location.search).get('item');
  if(!itemId){
    detail.style.display = 'none';
    grid.style.display = '';
    renderReadOnlyGallery('shopGrid');
    return;
  }

  grid.style.display = 'none';
  const items = await Api.getGallery();
  const item = items.find(it => it.id === itemId);

  if(!item){
    detail.innerHTML = `
      <div class="simple-section" style="text-align:center; padding-top:60px;">
        <p>We couldn't find that piece — it may have sold or been removed.</p>
        <a href="shop.html" class="btn btn-solid" style="display:inline-block; margin-top:16px; border-color:var(--ink); background:var(--ink); color:var(--white);">← Back to Shop</a>
      </div>`;
    detail.style.display = 'block';
    return;
  }

  // No real store integration in this static build — always show the
  // "coming soon" message rather than trying to reach a commerce API.
  const commerceStatus = { provider:'none', connected:false };

  detail.innerHTML = `
    <section class="simple-section" style="padding-top:50px;">
      <a href="shop.html" style="font-size:0.8rem; font-weight:600; color:var(--blush-line);">← Back to Shop</a>
      <div class="service-block reveal" style="padding-top:30px; border-bottom:none;">
        ${item.images && item.images.length > 1 ? `
          <div class="detail-carousel" id="detailCarousel">
            ${item.images.map((src,i)=>`<div class="detail-slide ${i===0?'active':''}" style="background-image:url('${src}')"></div>`).join('')}
            <button class="mega-nav mega-prev" id="detailPrev" aria-label="Previous photo">←</button>
            <button class="mega-nav mega-next" id="detailNext" aria-label="Next photo">→</button>
            <div class="mega-dots">${item.images.map((_,i)=>`<span class="dot ${i===0?'active':''}" data-i="${i}"></span>`).join('')}</div>
          </div>
        ` : `<img src="${item.src}" alt="${item.alt}">`}
        <div>
          <h3 class="slab" style="font-size:1.9rem;">${item.alt}</h3>
          ${item.price ? `<p style="font-size:1.3rem; font-weight:700; color:var(--blush-line); margin-bottom:14px;">Price Estimate: ${item.price}</p>` : ''}
          <p>${item.caption}</p>
          <div style="margin-top:24px; display:flex; gap:14px; flex-wrap:wrap;">
            <a href="contact.html" class="btn btn-solid" style="border-color:var(--ink); background:var(--ink); color:var(--white); display:inline-block; padding:14px 26px;">Enquire About This Piece</a>
            <button type="button" style="border:1px solid var(--line); background:var(--white); color:var(--ink-soft); padding:14px 26px; border-radius:2px; cursor:not-allowed; font-size:0.76rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;" disabled>Add to Cart</button>
          </div>
          <p style="font-size:0.76rem; color:var(--ink-soft); margin-top:14px;">
            ${commerceStatus.connected
              ? 'Online checkout available.'
              : 'Online checkout is coming soon — this piece will be purchasable directly once the shop connects Shopify or WooCommerce.'}
          </p>
        </div>
      </div>
    </section>`;
  detail.style.display = 'block';
  initReveal();

  if(item.images && item.images.length > 1){
    let dIdx = 0;
    const slides = detail.querySelectorAll('.detail-slide');
    const dots = detail.querySelectorAll('.detail-carousel .dot');
    function showDetail(i){
      dIdx = (i + item.images.length) % item.images.length;
      slides.forEach(s=>s.classList.remove('active'));
      dots.forEach(d=>d.classList.remove('active'));
      slides[dIdx].classList.add('active');
      dots[dIdx].classList.add('active');
    }
    detail.querySelector('#detailPrev').addEventListener('click', ()=>showDetail(dIdx-1));
    detail.querySelector('#detailNext').addEventListener('click', ()=>showDetail(dIdx+1));
    dots.forEach(d=>d.addEventListener('click', ()=>showDetail(parseInt(d.dataset.i, 10))));
  }
}

/* ---------------- admin dashboard (admin.html only) ---------------- */
function initAdminDashboard(){
  const gate = document.getElementById('adminGate');
  const dash = document.getElementById('adminDash');
  if(!gate || !dash) return;

  const loginForm = document.getElementById('loginForm');
  const pwInput = document.getElementById('adminPwInput');
  const loginError = document.getElementById('loginError');

  async function showDashIfLoggedIn(){
    const { loggedIn } = await Api.getSession();
    if(loggedIn){
      gate.style.display = 'none';
      dash.style.display = 'block';
      document.getElementById('logoutBtn').style.display = 'inline-block';
      renderDashboard();
      renderIgStatus();
      initAdminTabs();
      initPagesTabControls();
      renderQuotesList();
    }
  }
  showDashIfLoggedIn();

  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    loginError.textContent = '';
    const { status, data } = await Api.login(pwInput.value);
    if(status === 429){ loginError.textContent = data.error; return; }
    if(!data.ok){ loginError.textContent = data.error || 'Incorrect password.'; pwInput.value=''; return; }
    gate.style.display = 'none';
    dash.style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-block';
    renderDashboard();
    renderIgStatus();
    initAdminTabs();
    initPagesTabControls();
    renderQuotesList();
  });

  document.getElementById('logoutBtn').addEventListener('click', async ()=>{
    await Api.logout();
    location.reload();
  });

  /* ---- change password ---- */
  document.getElementById('changePwForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const current = document.getElementById('currentPwInput').value;
    const next = document.getElementById('newPwInput').value;
    const status = document.getElementById('changePwStatus');
    const { data } = await Api.changePassword(current, next);
    if(!data.ok){ status.textContent = data.error; status.style.color = '#a24a4a'; return; }
    status.textContent = 'Password updated.'; status.style.color = 'var(--ink-soft)';
    document.getElementById('changePwForm').reset();
  });

  /* ---- seasonal banner toggle ---- */
  const seasonalToggleInput = document.getElementById('seasonalToggleInput');
  seasonalToggleInput.addEventListener('change', async ()=>{
    await Api.setSeasonalEnabled(seasonalToggleInput.checked);
    renderDashboard();
  });

  /* ---- backup / restore (a plain JSON file, not a server endpoint) ---- */
  document.getElementById('exportBtn').addEventListener('click', async ()=>{
    const payload = {
      gallery: await Api.getGallery(),
      settings: await Api.getSettings(),
      pages: Store.pages.getAll(),
      quotes: await Api.getQuoteRequests()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'my-back-shed-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importInput').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev)=>{
      const { data } = await Api.restore(ev.target.result);
      if(data.ok){ renderDashboard(); alert('Backup restored.'); }
      else alert(data.error || 'That file could not be read as a gallery backup.');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  /* ---- instagram connection ----
     A real live feed requires a server to hold Meta's app secret and
     complete the OAuth handshake, which isn't possible in a static,
     no-backend build. The public pages already show curated fallback
     tiles, so this panel just explains that plainly. */
  async function renderIgStatus(){
    const dot = document.getElementById('igDot');
    const text = document.getElementById('igStatusText');
    const connectBtn = document.getElementById('igConnectBtn');
    const disconnectBtn = document.getElementById('igDisconnectBtn');
    dot.classList.remove('connected');
    text.textContent = 'Not available in this static build — the site always shows curated photos here instead. Connecting the real @mybackshed feed needs a small server to talk to Instagram\u2019s API securely.';
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'none';
  }

  /* ---- gallery CRUD ---- */
  const grid = document.getElementById('adminGrid');
  const overlay = document.getElementById('adminModal');
  const form = document.getElementById('adminForm');
  const fileInput = document.getElementById('adminImageInput');
  const thumbStrip = document.getElementById('adminThumbStrip');
  const seasonalCheck = document.getElementById('adminSeasonalCheck');
  const captionInput = document.getElementById('adminCaptionInput');
  const nameInput = document.getElementById('adminNameInput');
  const priceInput = document.getElementById('adminPriceInput');
  const skuInput = document.getElementById('adminSkuInput');
  let editingId = null;
  let keepImages = [];   // existing photo URLs kept when editing
  let pendingFiles = []; // newly chosen File objects, not yet saved

  async function renderDashboard(){
    const [items, settings] = await Promise.all([Api.getGallery(), Api.getSettings()]);
    document.getElementById('statTotal').textContent = items.length;
    document.getElementById('statSeasonal').textContent = items.filter(i=>i.seasonal).length;
    seasonalToggleInput.checked = settings.seasonalEnabled;
    document.getElementById('statBannerState').textContent = settings.seasonalEnabled ? 'On' : 'Off';

    grid.innerHTML = items.length ? items.map(it => `
      <div class="gallery-card" id="admin-${it.id}">
        <div class="g-img" style="background-image:url('${it.src}')">
          ${it.seasonal ? '<span class="seasonal-tag">Seasonal</span>' : ''}
          ${(it.images && it.images.length > 1) ? `<span class="photo-count-tag">📷 ${it.images.length}</span>` : ''}
        </div>
        <div class="g-body">
          <h4 class="slab">${it.alt}</h4>
          <p>${it.caption}</p>
          <div class="price-line" data-id="${it.id}">
            <span class="price-value">${it.price ? `Price Estimate: ${it.price}` : 'No estimate set'}</span>
            <button type="button" class="quick-price-edit" data-id="${it.id}" title="Change price estimate">✏️</button>
          </div>
          <div class="g-admin-row">
            <button class="edit-btn" data-id="${it.id}">Edit</button>
            <button class="remove-btn" data-id="${it.id}">Remove</button>
          </div>
        </div>
      </div>
    `).join('') : `<div class="gallery-empty">No pieces yet — add your first photo to get started.</div>`;

    grid.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click', ()=>openModal(b.dataset.id, items)));
    grid.querySelectorAll('.remove-btn').forEach(b=>b.addEventListener('click', async ()=>{
      if(confirm('Remove this piece from the gallery?')){
        await Api.deleteItem(b.dataset.id);
        renderDashboard();
      }
    }));

    // quick inline price-only edit — no need to open the full modal just to reprice something
    grid.querySelectorAll('.quick-price-edit').forEach(btn=>btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const it = items.find(x=>x.id===id);
      const line = document.querySelector(`.price-line[data-id="${id}"]`);
      line.innerHTML = `
        <div class="price-edit-row" style="width:100%;">
          <input type="text" value="${it.price || ''}" placeholder="e.g. $220">
          <button type="button" class="save-price">Save</button>
        </div>`;
      const input = line.querySelector('input');
      input.focus();
      line.querySelector('.save-price').addEventListener('click', async ()=>{
        const fd = new FormData();
        fd.append('price', input.value.trim());
        const { data } = await Api.updateItem(id, fd);
        if(!data.ok){ alert(data.error || 'Could not update the price.'); }
        renderDashboard();
      });
      input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); line.querySelector('.save-price').click(); } });
    }));
  }

  document.getElementById('addItemBtn').addEventListener('click', ()=>openModal(null, []));
  document.getElementById('adminModalClose').addEventListener('click', closeModal);
  document.getElementById('adminCancelBtn').addEventListener('click', closeModal);

  function renderThumbStrip(){
    const existingHtml = keepImages.map((src,i)=>`
      <div class="admin-thumb">
        <img src="${src}">
        <button type="button" class="remove-x" data-kind="keep" data-i="${i}">✕</button>
      </div>`).join('');
    const pendingHtml = pendingFiles.map((file,i)=>`
      <div class="admin-thumb">
        <img src="${URL.createObjectURL(file)}">
        <button type="button" class="remove-x" data-kind="pending" data-i="${i}">✕</button>
      </div>`).join('');
    thumbStrip.innerHTML = (existingHtml + pendingHtml) || `<span class="admin-thumb-empty">No photos yet.</span>`;
    thumbStrip.querySelectorAll('.remove-x').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = parseInt(btn.dataset.i, 10);
        if(btn.dataset.kind === 'keep') keepImages.splice(i,1); else pendingFiles.splice(i,1);
        renderThumbStrip();
      });
    });
  }

  function openModal(id, items){
    editingId = id;
    pendingFiles = [];
    if(id){
      const it = items.find(x=>x.id===id);
      document.getElementById('adminModalTitle').textContent = 'Edit Piece';
      nameInput.value = it.alt;
      captionInput.value = it.caption;
      seasonalCheck.checked = !!it.seasonal;
      priceInput.value = it.price || '';
      skuInput.value = it.sku || '';
      keepImages = Array.isArray(it.images) && it.images.length ? [...it.images] : (it.src ? [it.src] : []);
    } else {
      document.getElementById('adminModalTitle').textContent = 'Add a New Piece';
      nameInput.value = ''; captionInput.value = ''; seasonalCheck.checked = false;
      priceInput.value = ''; skuInput.value = '';
      keepImages = [];
    }
    fileInput.value = '';
    renderThumbStrip();
    overlay.classList.add('open');
  }
  function closeModal(){ overlay.classList.remove('open'); }

  fileInput.addEventListener('change', (e)=>{
    const remaining = 8 - keepImages.length - pendingFiles.length;
    const chosen = Array.from(e.target.files).slice(0, Math.max(0, remaining));
    if(e.target.files.length > chosen.length){
      alert('Maximum 8 photos per piece — some extra photos were not added.');
    }
    pendingFiles.push(...chosen);
    e.target.value = '';
    renderThumbStrip();
  });

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!nameInput.value.trim()){ alert('Give this piece a name.'); return; }
    if(keepImages.length + pendingFiles.length === 0){ alert('Add at least one photo.'); return; }

    const fd = new FormData();
    fd.append('alt', nameInput.value.trim());
    fd.append('caption', captionInput.value.trim());
    fd.append('seasonal', seasonalCheck.checked);
    fd.append('price', priceInput.value.trim());
    fd.append('sku', skuInput.value.trim());
    if(editingId) fd.append('keepImages', JSON.stringify(keepImages));
    pendingFiles.forEach(file => fd.append('images', file));

    const { data } = editingId ? await Api.updateItem(editingId, fd) : await Api.addItem(fd);
    if(!data.ok){ alert(data.error || 'Something went wrong saving this piece.'); return; }
    closeModal();
    renderDashboard();
  });
}

/* ---------------- admin: quote requests list ---------------- */
async function renderQuotesList(){
  const list = document.getElementById('quotesList');
  if(!list) return;
  const quotes = await Api.getQuoteRequests();
  list.innerHTML = quotes.length ? quotes.map(q => `
    <div class="quote-card" id="quote-${q.id}">
      <div class="quote-head">
        <div>
          <h4>${q.name}</h4>
          <div class="quote-meta">${q.email}${q.phone ? ' · ' + q.phone : ''} · ${new Date(q.createdAt).toLocaleString()}</div>
        </div>
        <button class="remove-btn" data-id="${q.id}">Remove</button>
      </div>
      ${q.projectType ? `<span class="quote-type">${q.projectType}</span>` : ''}
      <p>${q.message}</p>
    </div>
  `).join('') : `<p class="hint">No quote requests yet.</p>`;

  list.querySelectorAll('.remove-btn').forEach(b=>b.addEventListener('click', async ()=>{
    if(confirm('Delete this quote request?')){
      await Api.deleteQuoteRequest(b.dataset.id);
      renderQuotesList();
    }
  }));
}

/* ---------------- admin dashboard tabs ---------------- */
function initAdminTabs(){
  const tabs = document.querySelectorAll('.admin-tab');
  if(!tabs.length) return;
  tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabs.forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-tab-panel').forEach(p=>p.style.display = 'none');
      document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).style.display = 'block';
    });
  });
}

/* ---------------- Pages tab: content editor for About Us / Services ---------------- */
function initPagesTabControls(){
  const pageSelector = document.getElementById('pageSelector');
  const root = document.getElementById('pageEditorRoot');
  if(!pageSelector || !root) return;

  async function load(){
    const slug = pageSelector.value;
    root.innerHTML = `<div class="panel"><p class="hint" style="margin:0;">Loading…</p></div>`;
    try{
      const page = await Api.getPage(slug);
      renderPageEditor(slug, page, root);
    } catch(err){
      root.innerHTML = `<div class="panel"><p class="hint" style="color:#a24a4a; margin:0;">${err.message}</p></div>`;
    }
  }
  pageSelector.addEventListener('change', load);
  load();
}

function renderPageEditor(slug, page, root){
  const hasPhotos = Array.isArray(page.photos);
  const hasTeam = Array.isArray(page.team);
  const hasFaqs = Array.isArray(page.faqs);
  const hasTransformations = Array.isArray(page.transformations);
  const hasSwatches = Array.isArray(page.swatches);
  const hasCraftTiles = Array.isArray(page.craftTiles);

  root.innerHTML = `
    <div class="panel">
      <h3>Hero</h3>
      <p class="hint">The banner text at the top of the page.</p>
      <div class="page-hero-fields">
        <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--ink-soft);">Eyebrow</label>
        <input type="text" id="peHeroEyebrow" value="${escapeAttr(page.hero.eyebrow)}">
        <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--ink-soft);">Title</label>
        <input type="text" id="peHeroTitle" value="${escapeAttr(page.hero.title)}">
        <label style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--ink-soft);">Intro</label>
        <textarea id="peHeroIntro" style="min-height:80px;">${page.hero.intro || ''}</textarea>
      </div>
    </div>

    <div class="panel">
      <h3>Sections</h3>
      <p class="hint">The main text blocks on the page.</p>
      <div id="peSections">
        ${page.sections.map((s,i)=>`
          <div class="page-section-block" data-index="${i}">
            <label>Heading</label>
            <input type="text" class="pe-section-heading" value="${escapeAttr(s.heading)}">
            <label>Body</label>
            <textarea class="pe-section-body">${s.body || ''}</textarea>
          </div>
        `).join('')}
      </div>
      ${hasFaqs ? `
        <h3 style="margin-top:10px;">FAQ</h3>
        <p class="hint">Questions and answers shown in the FAQ accordion.</p>
        <div id="peFaqs">
          ${page.faqs.map((f,i)=>`
            <div class="page-section-block" data-faq-index="${i}">
              <label>Question</label>
              <input type="text" class="pe-faq-question" value="${escapeAttr(f.question)}">
              <label>Answer</label>
              <textarea class="pe-faq-answer">${f.answer || ''}</textarea>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="btn-row">
        <button type="button" id="pageSaveBtn">Save Page Text${hasFaqs ? ' &amp; FAQ' : ''}</button>
      </div>
      <div class="gate-error" id="pageSaveStatus" style="color:var(--ink-soft);"></div>
    </div>

    ${hasPhotos ? `
      <div class="panel">
        <h3>Photos</h3>
        <p class="hint">Shown in the photo grid on the page.</p>
        <div class="admin-thumb-strip" id="pePhotoStrip"></div>
        <input type="file" id="pePhotoInput" accept="image/*" multiple>
      </div>
    ` : ''}

    ${hasTeam ? `
      <div class="panel">
        <div class="gallery-toolbar-inline">
          <h3 style="margin:0;">Meet the Team</h3>
          <button type="button" class="manage-toggle-btn" id="addTeamBtn" style="background:var(--blush-line); border-color:var(--blush-line);">+ Add Team Member</button>
        </div>
        <div id="peTeamList"></div>
      </div>
    ` : ''}

    ${hasTransformations ? `
      <div class="panel">
        <h3>Before &amp; After Gallery</h3>
        <p class="hint">Each pair needs a "before" photo, an "after" photo, and an optional label (e.g. "Reupholstered Wing Chair").</p>
        <div id="peTransList"></div>
        <div class="admin-field" style="margin-top:16px; border-top:1px solid var(--line); padding-top:16px;">
          <label>Add a Pair</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
            <div>
              <label style="font-size:0.7rem;">Before photo</label>
              <input type="file" id="transBeforeInput" accept="image/*">
            </div>
            <div>
              <label style="font-size:0.7rem;">After photo</label>
              <input type="file" id="transAfterInput" accept="image/*">
            </div>
          </div>
          <input type="text" id="transLabelInput" placeholder="Label (optional)">
          <div class="btn-row"><button type="button" id="addTransBtn">Add Pair</button></div>
        </div>
      </div>
    ` : ''}

    ${hasSwatches ? `
      <div class="panel">
        <h3>Fabric Gallery</h3>
        <p class="hint">Fabric or finish swatches shown in a grid, each with a short label.</p>
        <div id="peSwatchList"></div>
        <div class="admin-field" style="margin-top:16px; border-top:1px solid var(--line); padding-top:16px;">
          <label>Add a Swatch</label>
          <input type="file" id="swatchPhotoInput" accept="image/*">
          <input type="text" id="swatchLabelInput" placeholder="e.g. Vintage Linen" style="margin-top:10px;">
          <div class="btn-row"><button type="button" id="addSwatchBtn">Add Swatch</button></div>
        </div>
      </div>
    ` : ''}

    ${hasCraftTiles ? `
      <div class="panel">
        <h3>Homepage Scrolling Photos</h3>
        <p class="hint">The auto-scrolling photo rows on the homepage's "Upholstery &amp; Custom Painting" section, each with a short caption.</p>
        <div id="peCraftTileList"></div>
        <div class="admin-field" style="margin-top:16px; border-top:1px solid var(--line); padding-top:16px;">
          <label>Add a Photo</label>
          <input type="file" id="craftTilePhotoInput" accept="image/*">
          <input type="text" id="craftTileLabelInput" placeholder="e.g. The Reupholstery" style="margin-top:10px;">
          <div class="btn-row"><button type="button" id="addCraftTileBtn">Add Photo</button></div>
        </div>
      </div>
    ` : ''}
  `;

  if(hasPhotos){
    function renderPhotoStrip(){
      const strip = document.getElementById('pePhotoStrip');
      strip.innerHTML = (page.photos || []).map(src => `
        <div class="admin-thumb">
          <img src="${src}">
          <button type="button" class="remove-x" data-src="${escapeAttr(src)}">✕</button>
        </div>
      `).join('') || `<span class="admin-thumb-empty">No photos yet.</span>`;
      strip.querySelectorAll('.remove-x').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const { data } = await Api.removePagePhoto(slug, btn.dataset.src);
          if(data.ok){ page.photos = data.photos; renderPhotoStrip(); }
        });
      });
    }
    renderPhotoStrip();

    document.getElementById('pePhotoInput').addEventListener('change', async (e)=>{
      if(!e.target.files.length) return;
      const fd = new FormData();
      Array.from(e.target.files).forEach(f => fd.append('photos', f));
      const { data } = await Api.addPagePhotos(slug, fd);
      if(data.ok){ page.photos = data.photos; renderPhotoStrip(); }
      e.target.value = '';
    });
  }

  if(hasTransformations){
    function renderTransList(){
      const list = document.getElementById('peTransList');
      const items = page.transformations || [];
      list.innerHTML = items.length ? items.map(t => `
        <div class="trans-card">
          <div class="trans-imgs"><img src="${t.before}" title="Before"><img src="${t.after}" title="After"></div>
          <div class="trans-label">${t.label || '(no label)'}</div>
          <button type="button" class="remove-btn" data-id="${t.id}">Remove</button>
        </div>
      `).join('') : `<p class="hint">No before/after pairs yet.</p>`;
      list.querySelectorAll('.remove-btn').forEach(b=>b.addEventListener('click', async ()=>{
        if(confirm('Remove this before/after pair?')){
          await Api.removeTransformation(slug, b.dataset.id);
          page.transformations = (page.transformations||[]).filter(t=>t.id!==b.dataset.id);
          renderTransList();
        }
      }));
    }
    renderTransList();

    document.getElementById('addTransBtn').addEventListener('click', async ()=>{
      const beforeFile = document.getElementById('transBeforeInput').files[0];
      const afterFile = document.getElementById('transAfterInput').files[0];
      if(!beforeFile || !afterFile){ alert('Choose both a before and an after photo.'); return; }
      const fd = new FormData();
      fd.append('before', beforeFile);
      fd.append('after', afterFile);
      fd.append('label', document.getElementById('transLabelInput').value.trim());
      const { data } = await Api.addTransformation(slug, fd);
      if(!data.ok){ alert(data.error || 'Something went wrong.'); return; }
      page.transformations = (page.transformations||[]).concat(data.item);
      document.getElementById('transBeforeInput').value = '';
      document.getElementById('transAfterInput').value = '';
      document.getElementById('transLabelInput').value = '';
      renderTransList();
    });
  }

  if(hasSwatches){
    function renderSwatchList(){
      const list = document.getElementById('peSwatchList');
      const items = page.swatches || [];
      list.innerHTML = items.length ? items.map(s => `
        <div class="swatch-card">
          <img src="${s.src}">
          <div class="swatch-label">${s.label || '(no label)'}</div>
          <button type="button" class="remove-btn" data-id="${s.id}">Remove</button>
        </div>
      `).join('') : `<p class="hint">No swatches yet.</p>`;
      list.querySelectorAll('.remove-btn').forEach(b=>b.addEventListener('click', async ()=>{
        if(confirm('Remove this swatch?')){
          await Api.removeSwatch(slug, b.dataset.id);
          page.swatches = (page.swatches||[]).filter(s=>s.id!==b.dataset.id);
          renderSwatchList();
        }
      }));
    }
    renderSwatchList();

    document.getElementById('addSwatchBtn').addEventListener('click', async ()=>{
      const file = document.getElementById('swatchPhotoInput').files[0];
      if(!file){ alert('Choose a photo.'); return; }
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('label', document.getElementById('swatchLabelInput').value.trim());
      const { data } = await Api.addSwatch(slug, fd);
      if(!data.ok){ alert(data.error || 'Something went wrong.'); return; }
      page.swatches = (page.swatches||[]).concat(data.item);
      document.getElementById('swatchPhotoInput').value = '';
      document.getElementById('swatchLabelInput').value = '';
      renderSwatchList();
    });
  }

  if(hasCraftTiles){
    function renderCraftTileList(){
      const list = document.getElementById('peCraftTileList');
      const items = page.craftTiles || [];
      list.innerHTML = items.length ? items.map(s => `
        <div class="swatch-card">
          <img src="${s.src}">
          <div class="swatch-label">${s.label || '(no caption)'}</div>
          <button type="button" class="remove-btn" data-id="${s.id}">Remove</button>
        </div>
      `).join('') : `<p class="hint">No photos yet — the scrolling row will be empty on the homepage.</p>`;
      list.querySelectorAll('.remove-btn').forEach(b=>b.addEventListener('click', async ()=>{
        if(confirm('Remove this photo from the homepage scroll?')){
          await Api.removeCraftTile(slug, b.dataset.id);
          page.craftTiles = (page.craftTiles||[]).filter(s=>s.id!==b.dataset.id);
          renderCraftTileList();
        }
      }));
    }
    renderCraftTileList();

    document.getElementById('addCraftTileBtn').addEventListener('click', async ()=>{
      const file = document.getElementById('craftTilePhotoInput').files[0];
      if(!file){ alert('Choose a photo.'); return; }
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('label', document.getElementById('craftTileLabelInput').value.trim());
      const { data } = await Api.addCraftTile(slug, fd);
      if(!data.ok){ alert(data.error || 'Something went wrong.'); return; }
      page.craftTiles = (page.craftTiles||[]).concat(data.item);
      document.getElementById('craftTilePhotoInput').value = '';
      document.getElementById('craftTileLabelInput').value = '';
      renderCraftTileList();
    });
  }

  if(hasTeam){
    function renderTeamList(){
      const list = document.getElementById('peTeamList');
      const team = page.team || [];
      list.innerHTML = team.length ? team.map(m => `
        <div class="team-member-card">
          <div class="tm-photo" style="${m.photo ? `background-image:url('${m.photo}')` : ''}"></div>
          <div class="tm-body">
            <h4>${m.name}</h4>
            <div class="tm-role">${m.role || ''}</div>
            <p>${m.bio || ''}</p>
            <div class="g-admin-row">
              <button class="edit-btn" data-id="${m.id}">Edit</button>
              <button class="remove-btn" data-id="${m.id}">Remove</button>
            </div>
          </div>
        </div>
      `).join('') : `<p class="hint">No team members yet.</p>`;

      list.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click', ()=>openTeamModal(team.find(m=>m.id===b.dataset.id))));
      list.querySelectorAll('.remove-btn').forEach(b=>b.addEventListener('click', async ()=>{
        if(confirm('Remove this team member?')){
          await Api.removeTeamMember(slug, b.dataset.id);
          page.team = (page.team||[]).filter(m=>m.id!==b.dataset.id);
          renderTeamList();
        }
      }));
    }
    renderTeamList();
    document.getElementById('addTeamBtn').addEventListener('click', ()=>openTeamModal(null));

    // team add/edit modal (shared markup, driven by whichever page is open)
    var teamOverlay = document.getElementById('teamModal');
    var teamForm = document.getElementById('teamForm');
    var teamPhotoInput = document.getElementById('teamPhotoInput');
    var teamPreview = document.getElementById('teamPreview');
    var teamNameInput = document.getElementById('teamNameInput');
    var teamRoleInput = document.getElementById('teamRoleInput');
    var teamBioInput = document.getElementById('teamBioInput');
    var editingMemberId = null;

    var openTeamModal = function(member){
      editingMemberId = member ? member.id : null;
      document.getElementById('teamModalTitle').textContent = member ? 'Edit Team Member' : 'Add Team Member';
      teamNameInput.value = member ? member.name : '';
      teamRoleInput.value = member ? member.role : '';
      teamBioInput.value = member ? member.bio : '';
      teamPreview.style.backgroundImage = member && member.photo ? `url('${member.photo}')` : '';
      teamPhotoInput.value = '';
      teamOverlay.classList.add('open');
    };
    function closeTeamModal(){ teamOverlay.classList.remove('open'); }

    document.getElementById('teamModalClose').onclick = closeTeamModal;
    document.getElementById('teamCancelBtn').onclick = closeTeamModal;

    teamPhotoInput.onchange = (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev)=>{ teamPreview.style.backgroundImage = `url('${ev.target.result}')`; };
      reader.readAsDataURL(file);
    };

    teamForm.onsubmit = async (e)=>{
      e.preventDefault();
      if(!teamNameInput.value.trim()){ alert('Give this team member a name.'); return; }
      const fd = new FormData();
      fd.append('name', teamNameInput.value.trim());
      fd.append('role', teamRoleInput.value.trim());
      fd.append('bio', teamBioInput.value.trim());
      if(teamPhotoInput.files[0]) fd.append('photo', teamPhotoInput.files[0]);

      const { data } = editingMemberId
        ? await Api.updateTeamMember(slug, editingMemberId, fd)
        : await Api.addTeamMember(slug, fd);
      if(!data.ok){ alert(data.error || 'Something went wrong saving this team member.'); return; }

      if(editingMemberId){
        page.team = (page.team||[]).map(m=>m.id===editingMemberId ? data.member : m);
      } else {
        page.team = (page.team||[]).concat(data.member);
      }
      closeTeamModal();
      renderTeamList();
    };
  }

  document.getElementById('pageSaveBtn').addEventListener('click', async ()=>{
    const hero = {
      eyebrow: document.getElementById('peHeroEyebrow').value.trim(),
      title: document.getElementById('peHeroTitle').value.trim(),
      intro: document.getElementById('peHeroIntro').value.trim()
    };
    const sectionBlocks = document.querySelectorAll('.page-section-block[data-index]');
    const sections = Array.from(sectionBlocks).map((block,i)=>({
      id: page.sections[i].id,
      heading: block.querySelector('.pe-section-heading').value.trim(),
      body: block.querySelector('.pe-section-body').value.trim()
    }));
    const payload = { hero, sections };
    if(hasFaqs){
      const faqBlocks = document.querySelectorAll('.page-section-block[data-faq-index]');
      payload.faqs = Array.from(faqBlocks).map((block,i)=>({
        id: page.faqs[i].id,
        question: block.querySelector('.pe-faq-question').value.trim(),
        answer: block.querySelector('.pe-faq-answer').value.trim()
      }));
    }
    const status = document.getElementById('pageSaveStatus');
    const { data } = await Api.savePageContent(slug, payload);
    status.textContent = data.ok ? 'Saved.' : (data.error || 'Something went wrong.');
    if(data.ok){ page.hero = hero; page.sections = sections; if(hasFaqs) page.faqs = payload.faqs; }
  });
}

function escapeAttr(str){
  return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

/* ---------------- craft scrolling marquee (homepage, backed by services.craftTiles) ----------------
   Only activates if a page includes an element with id="craftScrollWrap" —
   the current homepage design uses a static scrolling row instead, so this
   quietly does nothing there and is only for future use. */
async function initCraftScroll(){
  const wrap = document.getElementById('craftScrollWrap');
  if(!wrap) return;

  function tileHtml(t, hidden){
    return `
      <span class="cs-item"${hidden ? ' aria-hidden="true"' : ''}>
        <span class="cs-bg" style="background-image:url('${t.src}')"></span>
        <span class="cs-cap">${t.label || ''}</span>
      </span>`;
  }

  try{
    const page = await Api.getPage('services');
    const tiles = page.craftTiles || [];
    if(!tiles.length){ wrap.style.display = 'none'; return; }

    const mid = Math.ceil(tiles.length / 2);
    const row1 = tiles.slice(0, mid);
    const row2 = tiles.slice(mid).length ? tiles.slice(mid) : row1; // keep a second row even with few tiles

    wrap.innerHTML = `
      <div class="craft-scroll-row">
        <div class="craft-scroll-track">
          ${row1.map(t=>tileHtml(t,false)).join('')}
          ${row1.map(t=>tileHtml(t,true)).join('')}
        </div>
      </div>
      <div class="craft-scroll-row reverse">
        <div class="craft-scroll-track">
          ${row2.map(t=>tileHtml(t,false)).join('')}
          ${row2.map(t=>tileHtml(t,true)).join('')}
        </div>
      </div>`;
  } catch(err){
    wrap.style.display = 'none';
  }
}

/* ---------------- Instagram grid (homepage bottom + gallery top) ----------------
   No server means no secure OAuth handshake with Instagram, so this build
   always shows the curated stock tiles rather than attempting a live feed. */
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/mybackshed?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';

const INSTAGRAM_STOCK_TILES = [
  'https://images.unsplash.com/photo-1593069431672-f903a33c286f?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1517705008128-361805f42e86?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1511389026070-a14ae610a1be?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1653971858625-9cb23d0dca80?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1695457264710-304756bfc89c?fm=jpg&q=70&w=700&fit=crop&auto=format'
];

function initInstagramGrid(containerId){
  const grid = document.getElementById(containerId);
  if(!grid) return;
  grid.innerHTML = INSTAGRAM_STOCK_TILES.map(src => `
    <a class="insta-tile" href="${INSTAGRAM_PROFILE_URL}" target="_blank" rel="noopener noreferrer">
      <span class="insta-bg" style="background-image:url('${src}')"></span>
      <span class="insta-icon">◎</span>
    </a>
  `).join('');
}

/* ---------------- header hides on scroll-down, reappears on scroll-up ---------------- */
/* ---------------- mobile hamburger menu ---------------- */
function initMobileNav(){
  const toggle = document.querySelector('.nav-toggle');
  const navEl = document.querySelector('header nav');
  if(!toggle || !navEl) return;

  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Toggle menu');

  function closeMenu(){
    navEl.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
  }
  function openMenu(){
    navEl.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '✕';
  }

  toggle.addEventListener('click', (e)=>{
    e.stopPropagation();
    if(navEl.classList.contains('nav-open')) closeMenu(); else openMenu();
  });

  // tapping a link closes the menu instead of leaving it open behind the new page
  navEl.querySelectorAll('a').forEach(a=>a.addEventListener('click', closeMenu));

  // tapping anywhere outside the menu closes it
  document.addEventListener('click', (e)=>{
    if(navEl.classList.contains('nav-open') && !navEl.contains(e.target) && e.target !== toggle){
      closeMenu();
    }
  });

  // resizing past the mobile breakpoint (e.g. rotating a tablet) resets it
  window.addEventListener('resize', ()=>{
    if(window.innerWidth > 900) closeMenu();
  });
}

function initScrollHideNav(){
  const header = document.querySelector('header');
  if(!header) return;
  const banner = document.getElementById('seasonalBanner');
  const threshold = 120; // ignore small jitters right at the top of the page
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll(){
    const navEl = header.querySelector('nav');
    if(navEl && navEl.classList.contains('nav-open')) return;
    const currentY = window.scrollY;
    const scrolledDown = currentY > lastY;
    if(scrolledDown && currentY > threshold){
      header.classList.add('nav-hidden');
      if(banner) banner.classList.add('nav-scroll-hidden');
    } else {
      header.classList.remove('nav-hidden');
      if(banner) banner.classList.remove('nav-scroll-hidden');
    }
    lastY = currentY;
    ticking = false;
  }

  window.addEventListener('scroll', ()=>{
    if(!ticking){
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive:true });
}

document.addEventListener('DOMContentLoaded', ()=>{
  initReveal();
  initLazyBackgrounds();
  initParallax();
  initHeroSlideshow();
  initSeasonalBanner();
  initAdminDashboard();
  initInstagramGrid('instaGrid');
  initCraftScroll();
  initShopPage();
  initScrollHideNav();
  initMobileNav();
});
