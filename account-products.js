(() => {
  /**
   * Customer product management controller.
   *
   * Process: reuse the canonical storefront authentication client, wait for
   * the unified auth-ready event, load only products owned by the signed-in
   * customer, and manage listings through protected user_* RPC functions.
   * Ownership is always derived by the database from auth.uid().
   */
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = v => Number(v || 0).toLocaleString('en-US', { style:'currency', currency:'USD' });
  let db = null, user = null, products = [], categories = [], bound = false;

  function getAuthClient() {
    return window.PanamaXChangeAuth?.client || null;
  }

  function openModal(product = null) {
    const overlay = $('accountProductOverlay');
    if (!overlay) return;
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
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('accountProductName')?.focus();
  }

  function closeModal() {
    $('accountProductOverlay')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  async function loadCategories() {
    const { data, error } = await db.from('categories').select('name,slug').order('name');
    if (error) throw error;
    categories = data || [];
    $('accountProductCategory').innerHTML = '<option value="">Choose category</option>' +
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
    msg.textContent = 'Saving…';
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
    $('newAccountProduct')?.addEventListener('click', () => openModal());
    $('accountProductCancel')?.addEventListener('click', closeModal);
    $('accountProductClose')?.addEventListener('click', closeModal);
    $('accountProductOverlay')?.addEventListener('click', e => { if (e.target.id === 'accountProductOverlay') closeModal(); });
    $('accountProductForm')?.addEventListener('submit', saveProduct);
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
      await loadCategories();
      await loadProducts();
    } catch (error) {
      $('myProductsList').innerHTML = `<div class="account-empty-state">Unable to load your products: ${esc(error.message || error)}</div>`;
    }
  }

  function boot() {
    window.addEventListener('panamax-auth-ready', e => start(e.detail?.user || null), { once: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
    else start();
  }

  boot();
})();
