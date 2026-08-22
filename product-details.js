/**
 * PanamaXChange storefront product-details controller.
 *
 * Process: observe the live product grid rendered by app.js, ensure exactly one
 * View details action exists per product card, then open a richer commerce
 * modal using the card's already-rendered data. The controller reuses the
 * existing Add to Cart button and never creates another API client/session.
 */
(()=>{
  if(window.PanamaProductDetailsLoaded){window.PanamaProductDetailsLoaded.dedupe?.();return}
  const state=window.PanamaProductDetailsLoaded={dedupe:null};
  let modal,activeCard,activeProduct;
  const $=id=>document.getElementById(id);
  const escapeHTML=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  const numPrice=value=>Number(String(value??'').replace(/[^0-9.]/g,''))||0;

  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('div');modal.id='productDetailsOverlay';modal.className='product-details-overlay hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','productDetailsTitle');
    modal.innerHTML=`<div class="product-details-modal"><button class="product-details-close" id="productDetailsClose" type="button" aria-label="Close product details">✕</button><div class="product-details-grid"><div class="product-details-media" id="productDetailsMedia"></div><div class="product-details-content"><div class="product-details-badge">PRODUCT DETAILS</div><p class="eyebrow" id="productDetailsCategory"></p><h2 id="productDetailsTitle"></h2><div class="product-details-rating"><span>★★★★★</span><small>Customer ratings coming soon</small></div><p class="product-details-price" id="productDetailsPrice"></p><p class="product-details-stock" id="productDetailsStock"></p><p class="product-details-seller" id="productDetailsSeller"></p><div class="product-details-description" id="productDetailsDescription"></div><div class="product-details-highlights"><div><strong>✓</strong><span>Secure checkout</span></div><div><strong>✓</strong><span>Local delivery options</span></div><div><strong>✓</strong><span>Buyer support</span></div></div><div class="product-details-purchase"><label class="quantity-control">Quantity <span><button id="productQtyMinus" type="button" aria-label="Decrease quantity">−</button><input id="productQty" type="number" min="1" value="1" aria-label="Quantity"><button id="productQtyPlus" type="button" aria-label="Increase quantity">+</button></span></label><div class="product-details-total"><small>Estimated total</small><strong id="productDetailsTotal">$0.00</strong></div></div><div class="product-details-actions"><button class="primary-button" id="productDetailsAdd" type="button">Add to cart →</button><button class="secondary-button" id="productDetailsSave" type="button">♡ Save for later</button><button class="secondary-button" id="productDetailsShare" type="button">↗ Share</button><button class="secondary-button" id="productDetailsContinue" type="button">Continue shopping</button></div><div class="product-details-more"><details open><summary>Delivery & pickup</summary><p>Choose Standard delivery, Express delivery, or Local pickup at checkout when available.</p></details><details><summary>Returns & support</summary><p>Order support is available through your account and the marketplace support channel.</p></details><details><summary>Product information</summary><p id="productDetailsMeta"></p></details></div></div></div></div>`;
    document.body.appendChild(modal);
    const close=()=>{modal.classList.add('hidden');document.body.style.overflow='';activeCard=null;activeProduct=null};
    $('productDetailsClose').onclick=close;$('productDetailsContinue').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))close()});
    $('productQtyMinus').onclick=()=>changeQty(-1);$('productQtyPlus').onclick=()=>changeQty(1);$('productQty').oninput=updateTotal;$('productDetailsShare').onclick=shareProduct;$('productDetailsSave').onclick=saveProduct;
    return modal;
  }

  function readCard(card){
    const add=card.querySelector('.add-button');if(!add)return null;const image=card.querySelector('img');const paragraphs=[...card.querySelectorAll('.product-info > p')];const description=paragraphs.find(p=>!p.classList.contains('product-category')&&!p.classList.contains('product-seller')&&!p.classList.contains('product-price'));
    return {sourceAdd:add,id:Number(add.dataset.id),name:card.querySelector('.product-name')?.textContent?.trim()||'Product details',category:card.querySelector('.product-category')?.textContent?.trim()||'General',description:description?.textContent?.trim()||'No additional description has been provided for this product.',seller:card.querySelector('.product-seller strong')?.textContent?.trim()||'PanamaXChange',price:numPrice(card.querySelector('.product-price')?.textContent),stock:Number(card.dataset.stock||add.dataset.stock||0),imageUrl:image?.src||''};
  }
  function savedList(){try{return JSON.parse(localStorage.getItem('panamaxchange-wishlist')||'[]').map(Number).filter(Number.isFinite)}catch{return[]}}
  function saveList(list){localStorage.setItem('panamaxchange-wishlist',JSON.stringify([...new Set(list)]))}
  function updateTotal(){const qty=Math.max(1,Number($('productQty')?.value||1));$('productDetailsTotal').textContent=`$${(qty*Number(activeProduct?.price||0)).toFixed(2)}`}
  function changeQty(delta){if(!activeProduct)return;const input=$('productQty');let qty=Math.max(1,Number(input.value||1)+delta);if(activeProduct.stock>0)qty=Math.min(qty,activeProduct.stock);input.value=String(qty);updateTotal()}
  function open(card){
    activeCard=card;activeProduct=readCard(card);if(!activeProduct)return;ensureModal();
    $('productDetailsMedia').innerHTML=activeProduct.imageUrl?`<img src="${escapeHTML(activeProduct.imageUrl)}" alt="${escapeHTML(activeProduct.name)}">`:'<div class="product-details-placeholder" aria-hidden="true">🛍️</div>';
    $('productDetailsCategory').textContent=activeProduct.category;$('productDetailsTitle').textContent=activeProduct.name;$('productDetailsPrice').textContent=`$${activeProduct.price.toFixed(2)}`;
    const qty=activeProduct.stock,stock=$('productDetailsStock');stock.textContent=qty>5?`✓ In stock · ${qty} available`:qty>0?`⚠ Low stock · ${qty} available`:'Out of stock';stock.className=`product-details-stock ${qty>5?'in-stock':qty>0?'low-stock':'out-stock'}`;$('productDetailsSeller').textContent=`Posted by ${activeProduct.seller}`;$('productDetailsDescription').textContent=activeProduct.description;$('productDetailsMeta').textContent=`Product ID #${activeProduct.id} · Seller: ${activeProduct.seller}`;
    $('productQty').value='1';$('productQty').disabled=qty<=0;$('productQtyPlus').disabled=qty<=0;$('productQtyMinus').disabled=false;$('productDetailsAdd').disabled=qty<=0;$('productDetailsAdd').textContent=qty>0?'Add to cart →':'Out of stock';$('productDetailsSave').textContent=savedList().includes(activeProduct.id)?'♥ Saved':'♡ Save for later';updateTotal();modal.classList.remove('hidden');document.body.style.overflow='hidden';
  }
  function saveProduct(){if(!activeProduct)return;let list=savedList();list=list.includes(activeProduct.id)?list.filter(v=>v!==activeProduct.id):[...list,activeProduct.id];saveList(list);$('productDetailsSave').textContent=list.includes(activeProduct.id)?'♥ Saved':'♡ Save for later';document.querySelectorAll(`[data-px-wish="${activeProduct.id}"]`).forEach(b=>{b.classList.toggle('saved',list.includes(activeProduct.id));b.textContent=list.includes(activeProduct.id)?'♥ Saved':'♡ Save'})}
  async function shareProduct(){if(!activeProduct)return;const url=`${location.origin}${location.pathname}#product-${encodeURIComponent(activeProduct.id)}`;try{if(navigator.share)await navigator.share({title:activeProduct.name,text:`${activeProduct.name} on PanamaXChange`,url});else{await navigator.clipboard.writeText(url);$('productDetailsShare').textContent='Link copied ✓';setTimeout(()=>{$('productDetailsShare').textContent='↗ Share'},1200)}}catch(_){} }
  function addFromModal(){if(!activeProduct||!activeCard||activeProduct.stock<=0)return;const qty=Math.min(Math.max(1,Number($('productQty').value||1)),activeProduct.stock);for(let i=0;i<qty;i++)activeProduct.sourceAdd.click();const add=$('productDetailsAdd');add.textContent='Added ✓';add.disabled=true;setTimeout(()=>{add.textContent='Add to cart →';add.disabled=false},900)}
  function dedupe(){
    const grid=$('productGrid');if(!grid)return;grid.querySelectorAll('.product-card').forEach(card=>{const buttons=[...card.querySelectorAll('.view-details-button')];buttons.slice(1).forEach(b=>b.remove());const existing=buttons[0],add=card.querySelector('.add-button');if(existing&&!existing.dataset.bound){existing.dataset.bound='1';existing.onclick=()=>open(card)}if(existing||!add)return;const actions=document.createElement('div');actions.className='product-card-actions';add.parentNode.insertBefore(actions,add);actions.appendChild(add);const view=document.createElement('button');view.type='button';view.className='secondary-button view-details-button';view.dataset.bound='1';view.textContent='View details';view.onclick=()=>open(card);actions.appendChild(view)})
  }
  $('productDetailsAdd')?.addEventListener('click',addFromModal);
  state.dedupe=dedupe;function start(){ensureModal();dedupe();const grid=$('productGrid');if(grid)new MutationObserver(dedupe).observe(grid,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
