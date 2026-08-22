(() => {
  /**
   * PanamaXChange storefront enhancements.
   * Adds customer-focused commerce features without replacing the core catalog.
   * Process: inject wishlist/detail UI, synchronize local wishlist state, delegate
   * product-card actions, and add optional checkout shipping choices.
   */
  const WISHLIST_KEY = 'panamaxchange-wishlist';
  const readWishlist = () => { try { const v = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); return Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : []; } catch { return []; } };
  const saveWishlist = v => localStorage.setItem(WISHLIST_KEY, JSON.stringify([...new Set(v.map(Number))]));
  let wishlist = readWishlist();
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = value => `$${Number(value || 0).toFixed(2)}`;

  function injectCss() {
    if ($('storefrontEnhancementsCss')) return;
    const s = document.createElement('style');
    s.id = 'storefrontEnhancementsCss';
    s.textContent = `
      .wishlist-button{border:1px solid #d8dce5;background:#fff;border-radius:10px;padding:10px 13px;font-weight:700;cursor:pointer}
      .wishlist-button:hover{border-color:#635bff;color:#635bff}
      .product-extra-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
      .details-button,.wishlist-toggle{border:1px solid #d8dce5;background:#fff;border-radius:9px;padding:10px;font-weight:700;cursor:pointer}
      .details-button:hover,.wishlist-toggle:hover,.wishlist-toggle.saved{border-color:#635bff;color:#635bff}
      .product-detail-modal{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.58);backdrop-filter:blur(5px)}
      .product-detail-modal.hidden{display:none}
      .product-detail-card{width:min(860px,100%);max-height:92vh;overflow:auto;border-radius:20px;background:#fff;box-shadow:0 25px 90px rgba(0,0,0,.25)}
      .product-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
      .product-detail-media{min-height:420px;background:#f4f5f7;display:flex;align-items:center;justify-content:center}
      .product-detail-media img{width:100%;height:100%;min-height:420px;object-fit:cover}
      .product-detail-copy{padding:32px}
      .product-detail-copy h2{font-size:30px;line-height:1.1;margin:8px 0 12px}
      .product-detail-copy p{color:#666;line-height:1.6}
      .detail-seller{margin:15px 0;font-size:13px;color:#586174}.detail-price{font-size:28px!important;font-weight:800;color:#111!important;margin:12px 0 18px!important}.detail-stock{font-size:13px!important;margin-bottom:20px}
      .detail-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detail-actions button{padding:12px;border-radius:10px;font-weight:800;cursor:pointer}.detail-add{border:0;background:#111827;color:#fff}.detail-save{border:1px solid #d8dce5;background:#fff}.detail-close{position:absolute;top:14px;right:14px;border:0;background:#fff;border-radius:999px;width:38px;height:38px;font-size:18px;cursor:pointer}
      .wishlist-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100%);z-index:1250;background:#fff;box-shadow:-15px 0 45px rgba(0,0,0,.18);transform:translateX(100%);transition:transform .2s ease;display:flex;flex-direction:column}.wishlist-drawer.open{transform:translateX(0)}
      .wishlist-head{padding:18px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center}.wishlist-list{padding:15px 20px;overflow:auto;display:grid;gap:10px}.wishlist-item{display:grid;grid-template-columns:66px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid #eee;padding:10px 0}.wishlist-item img{width:66px;height:66px;object-fit:cover;border-radius:9px;background:#f3f4f6}.wishlist-item h4{font-size:14px;margin:0 0 4px}.wishlist-item p{font-size:12px;color:#666;margin:0}.wishlist-remove{border:0;background:none;color:#dc2626;font-size:12px;cursor:pointer}.shipping-box{margin:16px 0;padding:16px;border:1px solid #dbe4ee;border-radius:14px;background:#f8fafc}.shipping-grid{display:grid;gap:9px}.shipping-option{display:flex;gap:10px;align-items:flex-start;border:1px solid #d8e1eb;background:#fff;border-radius:11px;padding:12px;cursor:pointer}.shipping-option strong{display:block}.shipping-option small{display:block;color:#64748b;margin-top:2px}
      @media(max-width:760px){.product-detail-grid{grid-template-columns:1fr}.product-detail-media{min-height:280px}.product-detail-media img{min-height:280px}.product-detail-copy{padding:22px}.product-detail-copy h2{font-size:24px}.product-detail-modal{padding:10px}}
    `;
    document.head.appendChild(s);
  }

  function injectWishlistButton() {
    const wrap = document.querySelector('.user-auth-wrap');
    const header = document.querySelector('.header');
    if (!header || header.querySelector('#storefrontWishlistButton')) return;
    const b = document.createElement('button');
    b.id = 'storefrontWishlistButton'; b.className = 'wishlist-button'; b.type = 'button';
    b.textContent = `♡ Saved (${wishlist.length})`;
    b.addEventListener('click', openWishlist);
    (wrap || header).insertAdjacentElement('afterend', b);
  }

  function injectDetailModal() {
    if ($('productDetailModal')) return;
    const m = document.createElement('div');
    m.id = 'productDetailModal'; m.className = 'product-detail-modal hidden';
    m.innerHTML = `<div class="product-detail-card"><button class="detail-close" id="productDetailClose" aria-label="Close product details">✕</button><div class="product-detail-grid"><div id="detailMedia" class="product-detail-media"></div><div class="product-detail-copy"><div class="eyebrow">PRODUCT DETAILS</div><h2 id="detailTitle"></h2><p id="detailDescription"></p><p id="detailSeller" class="detail-seller"></p><p id="detailPrice" class="detail-price"></p><p id="detailStock" class="detail-stock"></p><div class="detail-actions"><button id="detailAdd" class="detail-add" type="button">Add to cart</button><button id="detailSave" class="detail-save" type="button">Save for later</button></div></div></div></div>`;
    document.body.appendChild(m);
    const close = () => { m.classList.add('hidden'); document.body.style.overflow = ''; };
    $('productDetailClose').addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    m._close = close;
  }

  function injectWishlistDrawer() {
    if ($('wishlistDrawer')) return;
    const d = document.createElement('aside');
    d.id = 'wishlistDrawer'; d.className = 'wishlist-drawer';
    d.innerHTML = `<div class="wishlist-head"><strong>Saved items</strong><button id="wishlistClose" class="close-button" type="button">✕</button></div><div id="wishlistList" class="wishlist-list"></div>`;
    document.body.appendChild(d);
    $('wishlistClose').addEventListener('click', closeWishlist);
  }

  function findProduct(id) { return (window.products || []).find(p => Number(p.id) === Number(id)); }

  function openDetail(id) {
    const p = findProduct(id); if (!p) return;
    injectDetailModal();
    const modal = $('productDetailModal');
    $('detailTitle').textContent = p.name || 'Product';
    $('detailDescription').textContent = p.description || 'No description available.';
    $('detailSeller').textContent = `Posted by ${typeof window.getProductSeller === 'function' ? window.getProductSeller(p) : (p.owner_id ? 'Registered seller' : 'PanamaXChange')}`;
    $('detailPrice').textContent = money(p.price);
    const qty = Number(p.stock || 0);
    $('detailStock').textContent = qty > 0 ? `${qty} available` : 'Currently out of stock';
    $('detailMedia').innerHTML = p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}">` : '<div style="font-size:70px">🛍️</div>';
    $('detailAdd').disabled = qty <= 0;
    $('detailAdd').textContent = qty > 0 ? 'Add to cart' : 'Out of stock';
    $('detailAdd').onclick = () => { if (typeof window.addToCart === 'function') { window.addToCart(Number(p.id)); $('detailAdd').textContent = 'Added ✓'; setTimeout(()=>{$('detailAdd').textContent='Add to cart'},800); } };
    $('detailSave').onclick = () => toggleWishlist(Number(p.id));
    modal.classList.remove('hidden'); document.body.style.overflow = 'hidden';
  }

  function toggleWishlist(id) {
    wishlist = wishlist.includes(id) ? wishlist.filter(v => v !== id) : [...wishlist, id];
    saveWishlist(wishlist);
    updateWishlistButton();
    renderWishlist();
    document.querySelectorAll(`[data-wishlist-id="${id}"]`).forEach(b => b.classList.toggle('saved', wishlist.includes(id)));
  }

  function updateWishlistButton() { const b = $('storefrontWishlistButton'); if (b) b.textContent = `♡ Saved (${wishlist.length})`; }
  function openWishlist(){ injectWishlistDrawer(); renderWishlist(); $('wishlistDrawer').classList.add('open'); }
  function closeWishlist(){ $('wishlistDrawer')?.classList.remove('open'); }

  function renderWishlist(){
    const list = $('wishlistList'); if (!list) return;
    const items = wishlist.map(findProduct).filter(Boolean);
    list.innerHTML = items.length ? items.map(p => `<div class="wishlist-item"><div>${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'🛍️'}</div><div><h4>${esc(p.name)}</h4><p>${money(p.price)}</p></div><button class="wishlist-remove" data-remove-wishlist="${esc(p.id)}">Remove</button></div>`).join('') : '<div class="cart-empty">No saved products yet.</div>';
    list.querySelectorAll('[data-remove-wishlist]').forEach(b=>b.addEventListener('click',()=>toggleWishlist(Number(b.dataset.removeWishlist))));
  }

  function enhanceProductCards(){
    document.querySelectorAll('.product-card').forEach(card => {
      if (card.dataset.enhanced) return;
      card.dataset.enhanced = '1';
      const add = card.querySelector('.add-button'); const id = Number(add?.dataset.id);
      if (!Number.isFinite(id)) return;
      const actions = document.createElement('div'); actions.className='product-extra-actions';
      actions.innerHTML=`<button class="details-button" type="button" data-details-id="${id}">View details</button><button class="wishlist-toggle ${wishlist.includes(id)?'saved':''}" type="button" data-wishlist-id="${id}">${wishlist.includes(id)?'♥ Saved':'♡ Save'}</button>`;
      add.insertAdjacentElement('afterend', actions);
      actions.querySelector('[data-details-id]').addEventListener('click',()=>openDetail(id));
      actions.querySelector('[data-wishlist-id]').addEventListener('click',()=>toggleWishlist(id));
    });
  }

  function enhanceCheckout(){
    const form = $('checkoutForm'); if (!form || form.querySelector('[data-shipping-box]')) return;
    const submit = form.querySelector('button[type="submit"]');
    const box = document.createElement('div'); box.className='shipping-box'; box.dataset.shippingBox='1';
    box.innerHTML='<h3>Delivery method</h3><div class="shipping-grid"><label class="shipping-option"><input type="radio" name="checkoutShippingMethod" value="standard" checked><span><strong>Standard delivery</strong><small>Reliable local delivery</small></span></label><label class="shipping-option"><input type="radio" name="checkoutShippingMethod" value="express"><span><strong>Express delivery</strong><small>Priority delivery where available</small></span></label><label class="shipping-option"><input type="radio" name="checkoutShippingMethod" value="pickup"><span><strong>Local pickup</strong><small>Collect after the order is confirmed</small></span></label></div>';
    form.insertBefore(box, submit);
  }

  function boot(){
    injectCss(); injectWishlistButton(); injectWishlistDrawer(); injectDetailModal(); enhanceCheckout();
    const grid = $('productGrid');
    if (grid) { const observer = new MutationObserver(enhanceProductCards); observer.observe(grid,{childList:true}); enhanceProductCards(); }
    updateWishlistButton();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
