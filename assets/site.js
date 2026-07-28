/* =====================================================================
   My Back Shed — shared front-end behaviors
   Talks to the Express API in server.js. Gallery data and the seasonal
   banner setting now live on the server (data/gallery.json,
   data/settings.json) instead of the browser, so every visitor and
   every device sees the same thing. Admin actions require a real
   server-side session — there is no password or session token sitting
   in the browser for anyone to inspect.
   ===================================================================== */

const Api = {
  async getGallery(){ return (await fetch('/api/gallery')).json(); },
  async getSettings(){ return (await fetch('/api/settings')).json(); },
  async setSeasonalEnabled(val){
    return (await fetch('/api/settings', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ seasonalEnabled: val })
    })).json();
  },
  async getSession(){ return (await fetch('/api/session')).json(); },
  async login(password){
    const res = await fetch('/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ password })
    });
    return { status: res.status, data: await res.json() };
  },
  async logout(){ return (await fetch('/api/logout', { method:'POST' })).json(); },
  async changePassword(currentPassword, newPassword){
    const res = await fetch('/api/change-password', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return { status: res.status, data: await res.json() };
  },
  async addItem(formData){
    const res = await fetch('/api/gallery', { method:'POST', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async updateItem(id, formData){
    const res = await fetch('/api/gallery/' + id, { method:'PUT', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async deleteItem(id){
    const res = await fetch('/api/gallery/' + id, { method:'DELETE' });
    return { status: res.status, data: await res.json() };
  },
  async restore(jsonText){
    const res = await fetch('/api/restore', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: jsonText
    });
    return { status: res.status, data: await res.json() };
  },
  async getPage(slug){
    const res = await fetch('/api/pages/' + slug);
    if(!res.ok){
      const body = await res.json().catch(()=>({}));
      throw new Error(body.error || `Could not load the "${slug}" page (${res.status}).`);
    }
    return res.json();
  },
  async savePageContent(slug, payload){
    const res = await fetch('/api/pages/' + slug, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    return { status: res.status, data: await res.json() };
  },
  async addPagePhotos(slug, formData){
    const res = await fetch(`/api/pages/${slug}/photos`, { method:'POST', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async removePagePhoto(slug, src){
    const res = await fetch(`/api/pages/${slug}/photos`, {
      method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ src })
    });
    return { status: res.status, data: await res.json() };
  },
  async addTeamMember(slug, formData){
    const res = await fetch(`/api/pages/${slug}/team`, { method:'POST', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async updateTeamMember(slug, id, formData){
    const res = await fetch(`/api/pages/${slug}/team/${id}`, { method:'PUT', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async removeTeamMember(slug, id){
    const res = await fetch(`/api/pages/${slug}/team/${id}`, { method:'DELETE' });
    return { status: res.status, data: await res.json() };
  },
  async addTransformation(slug, formData){
    const res = await fetch(`/api/pages/${slug}/transformations`, { method:'POST', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async removeTransformation(slug, id){
    const res = await fetch(`/api/pages/${slug}/transformations/${id}`, { method:'DELETE' });
    return { status: res.status, data: await res.json() };
  },
  async addSwatch(slug, formData){
    const res = await fetch(`/api/pages/${slug}/swatches`, { method:'POST', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async removeSwatch(slug, id){
    const res = await fetch(`/api/pages/${slug}/swatches/${id}`, { method:'DELETE' });
    return { status: res.status, data: await res.json() };
  },
  async addCraftTile(slug, formData){
    const res = await fetch(`/api/pages/${slug}/craftTiles`, { method:'POST', body: formData });
    return { status: res.status, data: await res.json() };
  },
  async removeCraftTile(slug, id){
    const res = await fetch(`/api/pages/${slug}/craftTiles/${id}`, { method:'DELETE' });
    return { status: res.status, data: await res.json() };
  },
  async getQuoteRequests(){ return (await fetch('/api/quote-requests')).json(); },
  async deleteQuoteRequest(id){
    const res = await fetch(`/api/quote-requests/${id}`, { method:'DELETE' });
    return { status: res.status, data: await res.json() };
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

/* ---------------- lazy-load background photos (any [data-bg] element, any page) ----------------
   Only fetches each image once it's about to scroll into view. */
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

/* ---------------- parallax banners (.parallax-bg, any page) ----------------
   A continuous rAF loop rather than a scroll listener, so it can't be missed
   by passive-listener or smooth-scroll timing quirks. Transform-based (not
   background-attachment:fixed) so it works on mobile too. */
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

/* ---------------- seasonal updates banner (togglable server-side, all pages) ----------------
   The ✕ only dismisses the banner for this browser tab/session — the actual
   on/off switch (affecting every visitor) lives on the admin dashboard. */
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

  let commerceStatus = { provider:'none', connected:false };
  try{ commerceStatus = await (await fetch('/api/commerce/status')).json(); } catch(e){}

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

  /* ---- backup / restore ---- */
  document.getElementById('exportBtn').addEventListener('click', ()=>{
    window.location.href = '/api/backup';
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

  /* ---- instagram connection ---- */
  async function renderIgStatus(){
    const res = await fetch('/api/instagram/connection');
    const { connected, configuredApp } = await res.json();
    const dot = document.getElementById('igDot');
    const text = document.getElementById('igStatusText');
    const connectBtn = document.getElementById('igConnectBtn');
    const disconnectBtn = document.getElementById('igDisconnectBtn');

    dot.classList.toggle('connected', connected);
    if(connected){
      text.textContent = 'Connected — the live feed is pulling real posts.';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'inline-block';
    } else if(!configuredApp){
      text.textContent = 'Not connected. Add IG_APP_ID and IG_APP_SECRET to .env first (see README).';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'none';
    } else {
      text.textContent = 'App is configured but not connected yet.';
      connectBtn.style.display = 'inline-block';
      disconnectBtn.style.display = 'none';
    }
  }

  document.getElementById('igConnectBtn').addEventListener('click', ()=>{
    window.location.href = '/auth/instagram';
  });
  document.getElementById('igDisconnectBtn').addEventListener('click', async ()=>{
    if(!confirm('Disconnect Instagram? The homepage and gallery will show the "Follow us" fallback until reconnected.')) return;
    await fetch('/api/instagram/disconnect', { method:'POST' });
    renderIgStatus();
  });

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
  let pendingFiles = []; // newly chosen File objects, not yet uploaded

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

/* ---------------- Pages tab: content editor for About Us (and future nav pages) ---------------- */
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

/* ---------------- craft scrolling marquee (homepage, backed by services.craftTiles) ---------------- */
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

/* ---------------- Instagram grid (homepage bottom + gallery top) ---------------- */
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/mybackshed?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';

// Shown in place of real posts until Instagram is actually connected, so the
// polaroid wall never looks broken or half-finished in the meantime. Swap
// these out for nothing once real posts are flowing — initInstagramGrid
// already prefers real data whenever it's available.
const INSTAGRAM_STOCK_TILES = [
  'https://images.unsplash.com/photo-1593069431672-f903a33c286f?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1517705008128-361805f42e86?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1511389026070-a14ae610a1be?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1653971858625-9cb23d0dca80?fm=jpg&q=70&w=700&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1695457264710-304756bfc89c?fm=jpg&q=70&w=700&fit=crop&auto=format'
];

async function initInstagramGrid(containerId){
  const grid = document.getElementById(containerId);
  if(!grid) return;

  function showStockTiles(){
    grid.innerHTML = INSTAGRAM_STOCK_TILES.map(src => `
      <a class="insta-tile" href="${INSTAGRAM_PROFILE_URL}" target="_blank" rel="noopener noreferrer">
        <span class="insta-bg" style="background-image:url('${src}')"></span>
        <span class="insta-icon">◎</span>
      </a>
    `).join('');
  }

  try{
    const res = await fetch('/api/instagram');
    const data = await res.json();
    if(data.configured && data.posts && data.posts.length){
      grid.innerHTML = data.posts.map(p => `
        <a class="insta-tile" href="${p.permalink}" target="_blank" rel="noopener noreferrer">
          <span class="insta-bg" style="background-image:url('${p.mediaUrl}')"></span>
          <span class="insta-icon">◎</span>
        </a>
      `).join('');
    } else {
      showStockTiles();
    }
  } catch(err){
    showStockTiles();
  }
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
