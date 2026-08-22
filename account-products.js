(() => {
  /**
   * Customer product management controller.
   *
   * Process: wait for the unified customer session, load categories and only
   * products manageable by the signed-in user, render searchable listings,
   * and use protected user_* RPCs for create/update/delete operations.
   * The edit popout exposes every product field supported by the current
   * products table while keeping ownership immutable and server-derived.
   */
  const auth = window.PanamaXChangeAuth;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = v => Number(v || 0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  let db = null, user = null, products = [], categories = [];

  function ensureEditorUI(){
    if($('accountProductEditorFields')) return;
    const form=$('accountProductForm'); if(!form)return;
    const message=$('accountProductMessage');
    const fields=document.createElement('div');
    fields.id='accountProductEditorFields';
    fields.className='account-product-editor-sections';
    fields.innerHTML=`
      <section class="account-product-editor-section">
        <div class="account-product-section-heading"><div><span class="editor-step">01</span><div><strong>Basic information</strong><small>Name, description and category</small></div></div></div>
        <label>Product name<input id="accountProductName" required maxlength="160" placeholder="e.g. Premium Panama Coffee"></label>
        <div class="field-help"><span id="accountProductNameCount">0/160</span><span>Use a clear customer-facing name.</span></div>
        <label>Description<textarea id="accountProductDescription" rows="6" maxlength="3000" placeholder="Explain condition, features, included items and anything customers should know."></textarea></label>
        <div class="field-help"><span id="accountProductDescriptionCount">0/3000</span><span>Good descriptions improve buyer confidence.</span></div>
        <label>Category<select id="accountProductCategory"><option value="">Choose category</option></select></label>
      </section>
      <section class="account-product-editor-section">
        <div class="account-product-section-heading"><div><span class="editor-step">02</span><div><strong>Price & inventory</strong><small>Control the offer customers see</small></div></div></div>
        <div class="account-form-grid">
          <label>Price<input id="accountProductPrice" type="number" min="0" step="0.01" required placeholder="0.00"></label>
          <label>Stock<input id="accountProductStockInput" type="number" min="0" step="1" required placeholder="0"></label>
        </div>
        <div class="editor-insights"><div><span>Stock status</span><strong id="accountProductStockPreview">Out of stock</strong></div><div><span>Listing value</span><strong id="accountProductValuePreview">$0.00</strong></div></div>
        <div class="field-help"><span>Ownership cannot be changed here.</span><span>The signed-in account remains the seller.</span></div>
      </section>
      <section class="account-product-editor-section">
        <div class="account-product-section-heading"><div><span class="editor-step">03</span><div><strong>Product image</strong><small>Preview the storefront image</small></div></div></div>
        <label>Image URL<input id="accountProductImage" type="url" maxlength="2000" placeholder="https://..."></label>
        <div id="accountProductImagePreview" class="editor-image-preview"><span>Image preview</span></div>
      </section>
      <section class="account-product-editor-section editor-summary-section">
        <div class="account-product-section-heading"><div><span class="editor-step">04</span><div><strong>Listing checklist</strong><small>Review before saving</small></div></div></div>
        <div id="accountProductChecklist" class="editor-checklist"></div>
      </section>`;
    const existing=[...form.children];
    existing.filter(el=>!['accountProductId','accountProductModalEyebrow','accountProductModalTitle','accountProductMessage'].includes(el.id)).forEach(el=>el.remove());
    form.insertBefore(fields,message||null);
    const actions=document.createElement('div');
    actions.className='account-product-modal-actions';
    actions.innerHTML='<button id="accountProductCancel" class="secondary-button" type="button">Cancel</button><button class="primary-button" type="submit">Save product</button>';
    form.appendChild(actions);
  }

  function bindFieldHelpers(){
    const name=$('accountProductName'),desc=$('accountProductDescription'),price=$('accountProductPrice'),stock=$('accountProductStockInput'),image=$('accountProductImage');
    const update=()=>{
      const n=name?.value||'',d=desc?.value||'',p=Number(price?.value||0),s=Number(stock?.value||0);
      if($('accountProductNameCount'))$('accountProductNameCount').textContent=`${n.length}/160`;
      if($('accountProductDescriptionCount'))$('accountProductDescriptionCount').textContent=`${d.length}/3000`;
      if($('accountProductValuePreview'))$('accountProductValuePreview').textContent=money(p*s);
      if($('accountProductStockPreview')){
        const state=s>5?'In stock':s>0?'Low stock':'Out of stock';
        $('accountProductStockPreview').textContent=`${state} · ${s}`;
        $('accountProductStockPreview').className=s>5?'good':s>0?'warn':'bad';
      }
      renderChecklist();
    };
    [name,desc,price,stock,image].forEach(el=>el?.addEventListener('input',()=>{update(); if(el===image)previewImage()}));
    $('accountProductCategory')?.addEventListener('change',update);
    update(); previewImage();
  }

  function previewImage(){
    const box=$('accountProductImagePreview'),url=$('accountProductImage')?.value?.trim(); if(!box)return;
    box.innerHTML=url?`<img src="${esc(url)}" alt="Product image preview" onerror="this.style.display='none';this.parentElement.innerHTML='<span>Unable to preview this image URL.</span>'">`:'<span>Image preview</span>';
  }

  function renderChecklist(){
    const box=$('accountProductChecklist'); if(!box)return;
    const checks=[
      ['accountProductName','Product name added',v=>!!v.trim()],
      ['accountProductDescription','Description added',v=>v.trim().length>=20],
      ['accountProductCategory','Category selected',v=>!!v],
      ['accountProductPrice','Valid price',v=>Number(v)>=0],
      ['accountProductStockInput','Inventory quantity set',v=>Number(v)>=0],
      ['accountProductImage','Product image supplied',v=>!!v.trim()]
    ];
    box.innerHTML=checks.map(([id,label,test])=>{const ok=test($(id)?.value||'');return `<div class="editor-check ${ok?'ok':''}"><span>${ok?'✓':'○'}</span>${label}</div>`}).join('');
  }

  function openModal(product = null) {
    ensureEditorUI();
    const overlay=$('accountProductOverlay'); if(!overlay)return;
    $('accountProductId').value=product?.id || '';
    $('accountProductModalTitle').textContent=product?'Edit product':'New product';
    $('accountProductModalEyebrow').textContent=product?'EDIT YOUR LISTING':'YOUR LISTING';
    $('accountProductName').value=product?.name || '';
    $('accountProductDescription').value=product?.description || '';
    $('accountProductPrice').value=product?.price ?? '';
    $('accountProductStockInput').value=product?.stock ?? 0;
    $('accountProductCategory').value=product?.category || '';
    $('accountProductImage').value=product?.image_url || '';
    $('accountProductMessage').textContent='';
    bindFieldHelpers();
    overlay.classList.remove('hidden'); document.body.style.overflow='hidden';
    $('accountProductName')?.focus();
  }
  function closeModal(){ $('accountProductOverlay')?.classList.add('hidden'); document.body.style.overflow=''; }

  async function loadCategories(){
    const {data,error}=await db.from('categories').select('name,slug').order('name');
    if(error) throw error; categories=data||[];
    $('accountProductCategory').innerHTML='<option value="">Choose category</option>' + categories.map(c=>`<option value="${esc(c.slug||c.name)}">${esc(c.name||c.slug)}</option>`).join('');
  }
  async function loadProducts(){
    const list=$('myProductsList'); if(!list)return;
    list.innerHTML='<div class="loading">Loading your products...</div>';
    const {data,error}=await db.rpc('user_manageable_products');
    if(error) throw error;
    products=Array.isArray(data)?data:[];
    render();
  }
  function filtered(){
    const q=String($('accountProductSearch')?.value||'').trim().toLowerCase(), stock=$('accountProductStock')?.value||'all', sort=$('accountProductSort')?.value||'newest';
    let list=products.filter(p=>{
      const qty=Number(p.stock||0), text=`${p.name||''} ${p.description||''} ${p.category||''}`.toLowerCase();
      return (!q||text.includes(q)) && (stock==='all'||(stock==='in'&&qty>5)||(stock==='low'&&qty>0&&qty<=5)||(stock==='out'&&qty<=0));
    });
    if(sort==='name') list.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    if(sort==='price-low') list.sort((a,b)=>Number(a.price||0)-Number(b.price||0));
    if(sort==='price-high') list.sort((a,b)=>Number(b.price||0)-Number(a.price||0));
    if(sort==='stock-low') list.sort((a,b)=>Number(a.stock||0)-Number(b.stock||0));
    if(sort==='newest') list.sort((a,b)=>Number(b.id||0)-Number(a.id||0));
    return list;
  }
  function render(){
    const list=filtered(), box=$('myProductsList'); if(!box)return;
    if($('productCount'))$('productCount').textContent=String(products.length);
    if($('accountProductCount'))$('accountProductCount').textContent=`${list.length} ${list.length===1?'product':'products'}`;
    box.innerHTML=list.length?list.map(p=>{
      const qty=Number(p.stock||0), state=qty>5?'In stock':qty>0?'Low stock':'Out of stock';
      return `<article class="account-product-card"><div class="account-product-image">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`:'<span>🛍️</span>'}</div><div class="account-product-body"><div class="account-product-meta"><span>${esc(p.category||'General')}</span><span class="product-stock-state ${qty>5?'good':qty>0?'warn':'bad'}">${esc(state)} · ${qty}</span></div><h3>${esc(p.name)}</h3><p>${esc(p.description||'No description')}</p><strong class="account-product-price">${money(p.price)}</strong><div class="account-product-actions"><button class="secondary-button" data-edit="${p.id}">Edit</button><button class="secondary-button danger" data-delete="${p.id}">Delete</button></div></div></article>`;
    }).join(''):'<div class="account-empty-state"><strong>No products yet.</strong><p>Create your first product and manage it here.</p></div>';
  }
  async function saveProduct(e){
    e.preventDefault(); const id=$('accountProductId').value;
    const payload={p_name:$('accountProductName').value.trim(),p_description:$('accountProductDescription').value.trim(),p_price:Number($('accountProductPrice').value),p_category:$('accountProductCategory').value,p_image_url:$('accountProductImage').value.trim(),p_stock:Number($('accountProductStockInput').value)};
    const msg=$('accountProductMessage'); msg.textContent='Saving…';
    try{
      if(id){ const {error}=await db.rpc('user_update_product',{p_id:Number(id),...payload}); if(error)throw error; }
      else { const {error}=await db.rpc('user_create_product',payload); if(error)throw error; }
      closeModal(); await loadProducts();
    }catch(error){ msg.textContent=error.message||'Unable to save product.'; }
  }
  async function deleteProduct(id){
    const product=products.find(p=>Number(p.id)===Number(id)); if(!product)return;
    if(!confirm(`Delete “${product.name}”? This cannot be undone.`))return;
    const {error}=await db.rpc('user_delete_product',{p_id:Number(id)});
    if(error){alert(error.message||'Unable to delete product.');return;}
    await loadProducts();
  }
  function bind(){
    $('newAccountProduct')?.addEventListener('click',()=>openModal());
    $('accountProductCancel')?.addEventListener('click',closeModal);
    $('accountProductClose')?.addEventListener('click',closeModal);
    $('accountProductOverlay')?.addEventListener('click',e=>{if(e.target.id==='accountProductOverlay')closeModal()});
    $('accountProductForm')?.addEventListener('submit',saveProduct);
    ['accountProductSearch','accountProductStock','accountProductSort'].forEach(id=>$(id)?.addEventListener('input',render));
    $('myProductsList')?.addEventListener('click',e=>{
      const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');
      if(edit)openModal(products.find(p=>Number(p.id)===Number(edit.dataset.edit)));
      if(del)deleteProduct(Number(del.dataset.delete));
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
    ensureEditorUI();
  }
  async function start(){
    if(!auth?.ready) return;
    db=await auth.ready; const {data}=await db.auth.getUser(); user=data?.user;
    if(!user)return;
    bind();
    try{await loadCategories();await loadProducts();}catch(error){$('myProductsList').innerHTML=`<div class="account-empty-state">Unable to load your products: ${esc(error.message||error)}</div>`}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
