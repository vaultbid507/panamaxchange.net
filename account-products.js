(() => {
  /**
   * Customer product management controller.
   *
   * Process: reuse the canonical storefront authentication client, ensure the
   * editor UI exists before any data request touches it, load only products
   * owned by the signed-in customer, and manage listings through protected
   * user_* RPC functions. Ownership is always derived by the database from
   * auth.uid().
   */
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = v => Number(v || 0).toLocaleString('en-US', { style:'currency', currency:'USD' });
  let db = null, user = null, products = [], categories = [], bound = false;

  function getAuthClient() { return window.PanamaXChangeAuth?.client || null; }

  /** Create the product editor markup when a page version does not contain it. */
  function ensureEditor() {
    if ($('accountProductOverlay')) return true;
    if (!document.body) return false;
    const overlay = document.createElement('div');
    overlay.id = 'accountProductOverlay';
    overlay.className = 'account-product-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'accountProductModalTitle');
    overlay.innerHTML = `
      <div class="account-product-modal">
        <button id="accountProductClose" class="account-product-close" type="button" aria-label="Close">✕</button>
        <p id="accountProductModalEyebrow" class="eyebrow">YOUR LISTING</p>
        <h2 id="accountProductModalTitle">New product</h2>
        <form id="accountProductForm">
          <input id="accountProductId" type="hidden">
          <div class="account-product-editor-sections">
            <section class="account-product-editor-section">
              <div class="account-product-section-heading"><div><span class="editor-step">01</span><div><strong>Product information</strong><small>Name and customer-facing description.</small></div></div></div>
              <div class="account-form-grid">
                <label>Product name<input id="accountProductName" maxlength="160" required></label>
                <label>Category<select id="accountProductCategory" required><option value="">Choose category</option></select></label>
                <label style="grid-column:1/-1">Description<textarea id="accountProductDescription" rows="4" maxlength="4000"></textarea></label>
              </div>
            </section>
            <section class="account-product-editor-section">
              <div class="account-product-section-heading"><div><span class="editor-step">02</span><div><strong>Pricing & inventory</strong><small>Control price and available stock.</small></div></div></div>
              <div class="account-form-grid">
                <label>Price<input id="accountProductPrice" type="number" min="0" step="0.01" required></label>
                <label>Stock<input id="accountProductStockInput" type="number" min="0" step="1" required></label>
              </div>
            </section>
            <section class="account-product-editor-section">
              <div class="account-product-section-heading"><div><span class="editor-step">03</span><div><strong>Product image</strong><small>Use a public image URL for the storefront.</small></div></div></div>
              <label>Image URL<input id="accountProductImage" type="url" placeholder="https://..."></label>
              <div id="accountProductImagePreview" class="editor-image-preview" style="margin-top:10px">Image preview</div>
            </section>
          </div>
          <div id="accountProductMessage" class="account-product-message" aria-live="polite"></div>
          <div class="account-product-modal-actions">
            <button id="accountProductCancel" class="secondary-button" type="button">Cancel</button>
            <button id="accountProductSave" class="primary-button" type="submit">Save product</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    return true;
  }

  function openModal(product = null) {
    if (!ensureEditor()) return;
    const overlay = $('accountProductOverlay');
    $('accountProductId').value = product?.id || '';
    $('accountProductModalTitle').textContent = product ? 'Edit product' : 'New product';
    $('accountProductModalEyebrow').textContent = product ? 'EDIT YOUR LISTING' : 'YOUR LISTING';
    $('accountProductName').value = product?.name || '';
    $('accountProductDescription').value = product?.description || '';
    $('accountProductPrice').value = product?.price ?? '';
    $('accountProductStockInput').value = product?.stock ?? 0;
    $('accountProductCategory').value = product?.category || '';
    $('accountProductImage').value = product?.image_url || '';
    $('accountProductMessage').textContent = '';
    updateImagePreview();
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('accountProductName')?.focus();
  }

  function closeModal() {
    $('accountProductOverlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function updateImagePreview() {
    const box = $('accountProductImagePreview');
    if (!box) return;
    const url = $('accountProductImage')?.value.trim();
    box.innerHTML = url
      ? `<img src="${esc(url)}" alt="Product preview" onerror="this.parentElement.textContent='Image could not be loaded.'">`
      : 'Image preview';
  }

  async function loadCategories() {
    if (!ensureEditor()) return;
    const select = $('accountProductCategory');
    if (!select) return;
    const { data, error } = await db.from('categories').select('name,slug').order('name');
    if (error) throw error;
    categories = data || [];
    select.innerHTML = '<option value="">Choose category</option>' +
      categories.map(c => `<option value="${esc(c.slug || c.name)}">${esc(c.name || c.slug)}</option>`).join('');
  }

  async function loadProducts() {
    const list = $('myProductsList');
    if (!list) return;
    list.innerHTML = '<div class="loading">Loading your products...</div>';
    const { data, error } = await db.rpc('user_manageable_products');
    if (error) throw error;
    products = Array.isArray(data) ? data : [];
    render();
  }

  function filtered() {
    const q = String($('accountProductSearch')?.value || '').trim().toLowerCase();
    const stock = $('accountProductStock')?.value || 'all';
    const sort = $('accountProductSort')?.value || 'newest';
    const list = products.filter(p => {
      const qty = Number(p.stock || 0);
      const text = `${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
      return (!q || text.includes(q)) &&
        (stock === 'all' || (stock === 'in' && qty > 5) || (stock === 'low' && qty > 0 && qty <= 5) || (stock === 'out' && qty <= 0));
    });
    if (sort === 'name') list.sort((a,b) => String(a.name || '').localeCompare(String(b.name || '')));
    if (sort === 'price-low') list.sort((a,b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === 'price-high') list.sort((a,b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === 'stock-low') list.sort((a,b) => Number(a.stock || 0) - Number(b.stock || 0));
    if (sort === 'newest') list.sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
    return list;
  }

  function render() {
    const list = filtered();
    const box = $('myProductsList');
    if (!box) return;
    if ($('productCount')) $('productCount').textContent = String(products.length);
    if ($('accountProductCount')) $('accountProductCount').textContent = `${list.length} ${list.length === 1 ? 'product' : 'products'}`;
    box.innerHTML = list.length ? list.map(p => {
      const qty = Number(p.stock || 0);
      const state = qty > 5 ? 'In stock' : qty > 0 ? 'Low stock' : 'Out of stock';
      return `<article class="account-product-card">
        <div class="account-product-image">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">` : '<span>🛍️</span>'}</div>
        <div class="account-product-body">
          <div class="account-product-meta"><span>${esc(p.category || 'General')}</span><span class="product-stock-state ${qty > 5 ? 'good' : qty > 0 ? 'warn' : 'bad'}">${esc(state)} · ${qty}</span></div>
          <h3>${esc(p.name)}</h3><p>${esc(p.description || 'No description')}</p><strong class="account-product-price">${money(p.price)}</strong>
          <div class="account-product-actions"><button class="secondary-button" type="button" data-edit="${p.id}">Edit</button><button class="secondary-button danger" type="button" data-delete="${p.id}">Delete</button></div>
        </div></article>`;
    }).join('') : '<div class="account-empty-state"><strong>No products yet.</strong><p>Create your first product and manage it here.</p></div>';
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!db || !user) {
      $('accountProductMessage').textContent = 'Please sign in before creating a product.';
      return;
    }
    const id = $('accountProductId').value;
    const payload = {
      p_name: $('accountProductName').value.trim(),
      p_description: $('accountProductDescription').value.trim(),
      p_price: Number($('accountProductPrice').value),
      p_category: $('accountProductCategory').value,
      p_image_url: $('accountProductImage').value.trim(),
      p_stock: Number($('accountProductStockInput').value)
    };
    const msg = $('accountProductMessage');
    const button = $('accountProductSave');
    msg.textContent = 'Saving…';
    if (button) button.disabled = true;
    try {
      if (!payload.p_name || !Number.isFinite(payload.p_price) || payload.p_price < 0 || !Number.isInteger(payload.p_stock) || payload.p_stock < 0) {
        throw new Error('Enter a valid product name, non-negative price, and whole-number stock quantity.');
      }
      if (id) {
        const { error } = await db.rpc('user_update_product', { p_id: Number(id), ...payload });
        if (error) throw error;
      } else {
        const { error } = await db.rpc('user_create_product', payload);
        if (error) throw error;
      }
      closeModal();
      await loadProducts();
    } catch (error) {
      msg.textContent = error.message || 'Unable to save product.';
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function deleteProduct(id) {
    const product = products.find(p => Number(p.id) === Number(id));
    if (!product || !db || !user) return;
    if (!confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    const { error } = await db.rpc('user_delete_product', { p_id: Number(id) });
    if (error) { alert(error.message || 'Unable to delete product.'); return; }
    await loadProducts();
  }

  function bind() {
    if (bound) return;
    bound = true;
    ensureEditor();
    $('newAccountProduct')?.addEventListener('click', () => openModal());
    $('accountProductCancel')?.addEventListener('click', closeModal);
    $('accountProductClose')?.addEventListener('click', closeModal);
    $('accountProductOverlay')?.addEventListener('click', e => { if (e.target.id === 'accountProductOverlay') closeModal(); });
    $('accountProductForm')?.addEventListener('submit', saveProduct);
    $('accountProductImage')?.addEventListener('input', updateImagePreview);
    ['accountProductSearch', 'accountProductStock', 'accountProductSort'].forEach(id => $(id)?.addEventListener('input', render));
    $('myProductsList')?.addEventListener('click', e => {
      const edit = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-delete]');
      if (edit) openModal(products.find(p => Number(p.id) === Number(edit.dataset.edit)));
      if (del) deleteProduct(Number(del.dataset.delete));
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  async function start(userFromEvent = null) {
    db = getAuthClient();
    if (!db) return;
    const current = userFromEvent || (await db.auth.getUser()).data?.user;
    if (!current) return;
    user = current;
    bind();
    try {
      ensureEditor();
      await loadCategories();
      await loadProducts();
    } catch (error) {
      const list = $('myProductsList');
      if (list) list.innerHTML = `<div class="account-empty-state">Unable to load your products: ${esc(error.message || error)}</div>`;
    }
  }

  function boot() {
    const startOnce = e => start(e?.detail?.user || null);
    window.addEventListener('panamax-auth-ready', startOnce, { once: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
    else start();
  }

  boot();
})();
