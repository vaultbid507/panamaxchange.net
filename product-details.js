/**
 * PanamaXChange storefront product-details controller.
 *
 * Process: observe the live product grid rendered by app.js, add a consistent
 * "View details" action to every product card, then open an accessible modal
 * containing the selected product's image, seller, category, description,
 * price, stock status, and cart action. The controller reuses the product
 * objects already loaded by app.js so it never creates a second API client.
 */
(()=>{
  const $ = (id) => document.getElementById(id);
  let modal;

  const escapeHTML = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#039;');

  const money = (value) => {
    const n = Number(value);
    return `$${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`;
  };

  function getProducts(){
    return Array.isArray(window.products) ? window.products : [];
  }

  function getSeller(product){
    try {
      if (typeof window.getProductSeller === 'function') return window.getProductSeller(product);
    } catch (_) {}
    return product?.owner_id ? 'Registered seller' : 'PanamaXChange';
  }

  function getCategory(product){
    try {
      if (typeof window.getProductCategory === 'function') return window.getProductCategory(product);
    } catch (_) {}
    return product?.category_slug || product?.category_name || product?.category || 'General';
  }

  function ensureModal(){
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'productDetailsOverlay';
    modal.className = 'product-details-overlay hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','productDetailsTitle');
    modal.innerHTML = `
      <div class="product-details-modal">
        <button class="product-details-close" type="button" aria-label="Close product details">✕</button>
        <div class="product-details-grid">
          <div class="product-details-media" id="productDetailsMedia"></div>
          <div class="product-details-content">
            <p class="eyebrow" id="productDetailsCategory"></p>
            <h2 id="productDetailsTitle"></h2>
            <p class="product-details-price" id="productDetailsPrice"></p>
            <p class="product-details-stock" id="productDetailsStock"></p>
            <p class="product-details-seller" id="productDetailsSeller"></p>
            <div class="product-details-description" id="productDetailsDescription"></div>
            <div class="product-details-actions">
              <button class="primary-button" id="productDetailsAdd" type="button">Add to cart →</button>
              <button class="secondary-button" id="productDetailsContinue" type="button">Continue shopping</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    };
    modal.querySelector('.product-details-close').addEventListener('click', close);
    $('productDetailsContinue').addEventListener('click', close);
    modal.addEventListener('click', (event)=>{ if(event.target === modal) close(); });
    document.addEventListener('keydown', (event)=>{ if(event.key === 'Escape' && !modal.classList.contains('hidden')) close(); });
    return modal;
  }

  function open(product){
    const m = ensureModal();
    const media = $('productDetailsMedia');
    media.innerHTML = product?.image_url
      ? `<img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(product.name)}">`
      : '<div class="product-details-placeholder" aria-hidden="true">🛍️</div>';
    $('productDetailsCategory').textContent = getCategory(product);
    $('productDetailsTitle').textContent = product?.name || 'Product details';
    $('productDetailsPrice').textContent = money(product?.price);
    const qty = Number(product?.stock || 0);
    const stock = $('productDetailsStock');
    stock.textContent = qty > 5 ? `✓ In stock · ${qty} available` : qty > 0 ? `⚠ Low stock · ${qty} available` : 'Out of stock';
    stock.className = `product-details-stock ${qty > 5 ? 'in-stock' : qty > 0 ? 'low-stock' : 'out-stock'}`;
    $('productDetailsSeller').textContent = `Posted by ${getSeller(product)}`;
    $('productDetailsDescription').textContent = product?.description || 'No additional description has been provided for this product.';

    const add = $('productDetailsAdd');
    add.disabled = qty <= 0;
    add.textContent = qty > 0 ? 'Add to cart →' : 'Out of stock';
    add.onclick = () => {
      if (qty <= 0) return;
      if (typeof window.addToCart === 'function') {
        window.addToCart(Number(product.id));
        const original = add.textContent;
        add.textContent = 'Added ✓';
        add.disabled = true;
        setTimeout(()=>{ add.textContent = original; add.disabled = false; }, 900);
      }
    };
    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function decorate(){
    const grid = $('productGrid');
    if (!grid) return;
    grid.querySelectorAll('.product-card').forEach((card)=>{
      if (card.querySelector('.view-details-button')) return;
      const id = Number(card.querySelector('.add-button')?.dataset.id);
      if (!Number.isFinite(id)) return;
      const product = getProducts().find((item)=>Number(item.id) === id);
      if (!product) return;
      const actions = document.createElement('div');
      actions.className = 'product-card-actions';
      const add = card.querySelector('.add-button');
      if (!add) return;
      add.parentNode.insertBefore(actions, add);
      actions.appendChild(add);
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'secondary-button view-details-button';
      view.textContent = 'View details';
      view.addEventListener('click', ()=>open(product));
      actions.appendChild(view);
    });
  }

  function start(){
    ensureModal();
    const grid = $('productGrid');
    if (!grid) return;
    decorate();
    new MutationObserver(decorate).observe(grid,{childList:true,subtree:true});
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
