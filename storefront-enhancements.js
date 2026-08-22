(()=>{
  /**
   * PanamaXChange storefront commerce enhancements.
   *
   * Process: add saved-item controls and delivery choices to the existing
   * storefront, while leaving product-details rendering to product-details.js.
   * Keeping one product-details controller prevents duplicate buttons, stale
   * data paths, and competing modal implementations.
   */
  const URL='https://tagbxmpizwlvgddgcpcl.supabase.co',KEY='sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHKbF0';
  const db=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'panamaxchange-auth'}});
  const W='panamaxchange-wishlist'; const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>`$${Number(v||0).toFixed(2)}`;
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(W)||'[]');return Array.isArray(v)?v.map(Number).filter(Number.isFinite):[]}catch{return[]}};
  let saved=read();
  const persist=()=>localStorage.setItem(W,JSON.stringify([...new Set(saved)]));

  function css(){if($('pxCommerceCss'))return;const s=document.createElement('style');s.id='pxCommerceCss';s.textContent=`
  .px-saved{border:1px solid #d8dce5;background:#fff;border-radius:10px;padding:10px 13px;font-weight:700;cursor:pointer}.px-saved:hover{border-color:#635bff;color:#635bff}
  .px-actions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px}.px-actions button{padding:10px;border-radius:9px;font-weight:700;cursor:pointer}.px-wish{border:1px solid #d8dce5;background:#fff}.px-wish.saved{border-color:#635bff;color:#635bff}
  .px-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100%);z-index:1450;background:#fff;box-shadow:-15px 0 45px rgba(0,0,0,.18);transform:translateX(100%);transition:transform .2s;display:flex;flex-direction:column}.px-drawer.open{transform:translateX(0)}.px-drawer-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #eee}.px-list{padding:16px 20px;overflow:auto}.px-item{display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #eee}.px-item img{width:64px;height:64px;object-fit:cover;border-radius:8px;background:#f3f4f6}.px-item h4{font-size:14px;margin:0 0 4px}.px-item p{font-size:12px;color:#666;margin:0}.px-remove{border:0;background:none;color:#dc2626;cursor:pointer}
  .px-shipping{margin:16px 0;padding:16px;border:1px solid #dbe4ee;border-radius:14px;background:#f8fafc}.px-shipping-grid{display:grid;gap:9px}.px-ship{display:flex;gap:10px;padding:12px;border:1px solid #d8e1eb;background:#fff;border-radius:11px;cursor:pointer}.px-ship strong{display:block}.px-ship small{display:block;color:#64748b;margin-top:2px}
  @media(max-width:760px){.px-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}

  function setSavedButton(){const b=$('pxSavedButton');if(b)b.textContent=`♡ Saved (${saved.length})`}
  function mountSaved(){const h=document.querySelector('.header');if(!h||$('pxSavedButton'))return;const b=document.createElement('button');b.id='pxSavedButton';b.className='px-saved';b.type='button';b.addEventListener('click',openDrawer);h.appendChild(b);setSavedButton()}
  function mountDrawer(){if($('pxDrawer'))return;const d=document.createElement('aside');d.id='pxDrawer';d.className='px-drawer';d.innerHTML=`<div class="px-drawer-head"><strong>Saved items</strong><button id="pxDrawerClose" class="close-button" type="button">✕</button></div><div id="pxList" class="px-list"></div>`;document.body.appendChild(d);$('pxDrawerClose').onclick=closeDrawer}
  async function getSavedProducts(){if(!saved.length||!db)return[];const r=await db.from('products').select('id,name,price,image_url').in('id',saved);return r.error?[]:(r.data||[])}
  async function toggle(id){saved=saved.includes(id)?saved.filter(v=>v!==id):[...saved,id];persist();setSavedButton();document.querySelectorAll(`[data-px-wish="${id}"]`).forEach(b=>{b.classList.toggle('saved',saved.includes(id));b.textContent=saved.includes(id)?'♥ Saved':'♡ Save'});renderDrawer()}
  async function renderDrawer(){const list=$('pxList');if(!list)return;const items=await getSavedProducts();list.innerHTML=items.length?items.map(p=>`<div class="px-item"><div>${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}">`:'🛍️'}</div><div><h4>${esc(p.name)}</h4><p>${money(p.price)}</p></div><button class="px-remove" data-px-remove="${p.id}">Remove</button></div>`).join(''):'<p class="cart-empty">No saved products yet.</p>';list.querySelectorAll('[data-px-remove]').forEach(b=>b.onclick=()=>toggle(Number(b.dataset.pxRemove)))}
  function openDrawer(){mountDrawer();renderDrawer();$('pxDrawer').classList.add('open')};function closeDrawer(){$('pxDrawer')?.classList.remove('open')}
  function enhanceCards(){document.querySelectorAll('.product-card').forEach(c=>{if(c.dataset.pxEnhanced)return;c.dataset.pxEnhanced='1';const add=c.querySelector('.add-button');const id=Number(add?.dataset.id);if(!Number.isFinite(id))return;const a=document.createElement('div');a.className='px-actions';const wish=document.createElement('button');wish.type='button';wish.className=`px-wish ${saved.includes(id)?'saved':''}`;wish.dataset.pxWish=String(id);wish.textContent=saved.includes(id)?'♥ Saved':'♡ Save';wish.onclick=()=>toggle(id);a.appendChild(wish);add.insertAdjacentElement('afterend',a)})}
  function enhanceCheckout(){const f=$('checkoutForm');if(!f||f.querySelector('[data-px-shipping]'))return;const submit=f.querySelector('button[type="submit"]');const b=document.createElement('div');b.className='px-shipping';b.dataset.pxShipping='1';b.innerHTML='<h3>Delivery method</h3><div class="px-shipping-grid"><label class="px-ship"><input type="radio" name="checkoutShippingMethod" value="standard" checked><span><strong>Standard delivery</strong><small>Reliable local delivery</small></span></label><label class="px-ship"><input type="radio" name="checkoutShippingMethod" value="express"><span><strong>Express delivery</strong><small>Priority delivery where available</small></span></label><label class="px-ship"><input type="radio" name="checkoutShippingMethod" value="pickup"><span><strong>Local pickup</strong><small>Collect after confirmation</small></span></label></div>';f.insertBefore(b,submit)}
  function boot(){css();mountSaved();mountDrawer();enhanceCheckout();const g=$('productGrid');if(g){new MutationObserver(enhanceCards).observe(g,{childList:true});enhanceCards()}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
