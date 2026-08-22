/**
 * PanamaXChange storefront product-details controller.
 *
 * Process: observe the live product grid rendered by app.js, add a consistent
 * "View details" action to every product card, then open an accessible modal
 * using the product card's already-rendered data. The controller deliberately
 * reuses the existing Add to Cart button instead of creating another API/auth
 * client, preventing duplicate state and authentication drift.
 */
(()=>{
  const $ = (id) => document.getElementById(id);
  let modal;

  const escapeHTML = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#039;');

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

  function readCard(card){
    const add = card.querySelector('.add-button');
    if(!add) return null;
    const image = card.querySelector('img');
    const description = Array.from(card.querySelectorAll('.product-info > p'))
      .find((p)=>!p.classList.contains('product-category')&&!p.classList.contains('product-seller')&&!p.classList.contains('product-price'));
    return {
      sourceAdd:add,
      name: card.querySelector('.product-name')?.textContent?.trim() || 'Product details',
      category: card.querySelector('.product-category')?.textContent?.trim() || 'General',
      description: description?.textContent?.trim() || 'No additional description has been provided for this product.',
      seller: card.querySelector('.product-seller strong')?.textContent?.trim() || 'PanamaXChange',
      price: card.querySelector('.product-price')?.textContent?.trim() || '$0.00',
      stock: card.dataset.stock || add.dataset.stock || '',
      imageUrl: image?.src || ''
    };
  }

  function open(card){
    const product = readCard(card);
    if(!product) return;
    const m = ensureModal();
    $('productDetailsMedia').innerHTML = product.imageUrl
      ? `<img src="${escapeHTML(product.imageUrl)}" alt="${escapeHTML(product.name)}">`
      : '<div class="product-details-placeholder" aria-hidden="true">🛍️</div>';
    $('productDetailsCategory').textContent = product.category;
    $('productDetailsTitle').textContent = product.name;
    $('productDetailsPrice').textContent = product.price;
    $('productDetailsStock').textContent = product.stock ? `Stock available: ${product.stock}` : 'Stock availability shown on the product card.';
    $('productDetailsSeller').textContent = `Posted by ${product.seller}`;
    $('productDetailsDescription').textContent = product.description;

    const add = $('productDetailsAdd');
    add.disabled = !!product.sourceAdd.disabled;
    add.textContent = product.sourceAdd.disabled ? 'Out of stock' : 'Add to cart →';
    add.onclick = () => {
      if(product.sourceAdd.disabled) return;
      product.sourceAdd.click();
      add.textContent = 'Added ✓';
      add.disabled = true;
      setTimeout(()=>{ add.textContent = 'Add to cart →'; add.disabled = false; }, 900);
    };
    m.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function decorate(){
    const grid = $('productGrid');
    if (!grid) return;
    grid.querySelectorAll('.product-card').forEach((card)=>{
      if (card.querySelector('.view-details-button')) return;
      if (!card.querySelector('.add-button')) return;
      const actions = document.createElement('div');
      actions.className = 'product-card-actions';
      const add = card.querySelector('.add-button');
      add.parentNode.insertBefore(actions, add);
      actions.appendChild(add);
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'secondary-button view-details-button';
      view.textContent = 'View details';
      view.addEventListener('click', ()=>open(card));
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
