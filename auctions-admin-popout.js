(()=>{
  /**
   * PanamaXChange — Auction Management with the canonical shared Admin authentication.
   *
   * Process:
   * 1. Reuse the exact Supabase Admin client/session used by admin-auth.js.
   * 2. Fall back to the same canonical Supabase configuration only when direct access
   *    occurs before admin-auth.js has initialized its shared client.
   * 3. Require an authenticated administrator without creating a competing session.
   * 4. Load products and auctions through the protected Admin APIs/RPCs.
   * 5. Render the auction table with search, filtering and live status information.
   * 6. Open Create and Edit forms in centered Product-style modal popouts.
   * 7. Validate all auction values before writing them.
   * 8. Refresh the table after successful mutations.
   */
  const SUPABASE_URL='https://tagbxmpizwlvgddgcpcl.supabase.co';
  // This key is intentionally identical to the canonical key in admin-auth.js.
  const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ2J4bXBpemNsZ2RkZ2NwbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzg2NjY3MzQxLCJleHAiOjIxMDIyNDAwMDB9.wOtr8Mxqz79BuXY1nMC0fbR0iAkuC3j282opFR9oZi0';
  const STORAGE='panamaxchange-auth';

  let db=null;
  let auctions=[];
  let products=[];

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money=value=>Number(value||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const wait=promise=>Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Request timed out. Check Supabase connection and permissions.')),12000))
  ]);

  /** Resolve the one shared Admin Supabase client. */
  function getClient(){
    if(db) return db;
    const shared=window.PanamaAdminAuth?.client;
    db=shared||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORAGE}
    });
    return db;
  }

  /** Require the existing Admin session and administrator permission. */
  async function requireAdmin(){
    const client=getClient();
    const {data,error}=await wait(client.auth.getSession());
    if(error) throw error;
    if(!data?.session){
      location.replace(`admin.html?returnTo=${encodeURIComponent('auctions-admin.html')}`);
      return false;
    }
    const permission=await wait(client.rpc('is_admin'));
    if(permission.error) throw permission.error;
    if(permission.data!==true){
      await client.auth.signOut({scope:'local'});
      location.replace(`admin.html?returnTo=${encodeURIComponent('auctions-admin.html')}`);
      return false;
    }
    return true;
  }

  /** Convert an ISO timestamp into a datetime-local input value. */
  function toLocalInput(value){
    const date=new Date(value);
    if(!Number.isFinite(date.getTime())) return '';
    const offset=date.getTimezoneOffset()*60000;
    return new Date(date.getTime()-offset).toISOString().slice(0,16);
  }

  /** Load products for both create and edit forms. */
  async function loadProducts(){
    const client=getClient();
    const selects=[$('createProductId'),$('editProductId')].filter(Boolean);
    selects.forEach(select=>{select.innerHTML='<option value="">Loading products...</option>';});
    const result=await wait(client.from('products').select('id,name').order('name'));
    if(result.error) throw result.error;
    products=result.data||[];
    const options=products.length?products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''):'<option value="">No products available</option>';
    selects.forEach(select=>{select.innerHTML=options;});
  }

  /** Load auctions through the protected Admin RPC. */
  async function loadAuctions(){
    const client=getClient();
    $('auctionRows').innerHTML='<tr><td colspan="7" class="empty">Loading auctions...</td></tr>';
    const result=await wait(client.rpc('admin_list_auctions'));
    if(result.error) throw result.error;
    auctions=result.data||[];
    updateSummary();
    renderRows();
  }

  /** Update auction summary counters. */
  function updateSummary(){
    $('auctionTotal').textContent=auctions.length;
    $('auctionLive').textContent=auctions.filter(a=>a.status==='live').length;
    $('auctionScheduled').textContent=auctions.filter(a=>a.status==='scheduled').length;
    $('auctionEnded').textContent=auctions.filter(a=>a.status==='ended').length;
  }

  /** Resolve a product display name safely. */
  function productName(id){
    const product=products.find(p=>String(p.id)===String(id));
    return product?.name||auctions.find(a=>String(a.product_id)===String(id))?.product_name||'Product';
  }

  /** Render the filtered auction table. */
  function renderRows(){
    const query=($('auctionSearch').value||'').trim().toLowerCase();
    const filter=$('auctionFilter').value;
    const visible=auctions.filter(auction=>{
      const text=`${auction.title||''} ${productName(auction.product_id)}`.toLowerCase();
      return (!query||text.includes(query))&&(!filter||auction.status===filter);
    });
    $('auctionRows').innerHTML=visible.length?visible.map(a=>`
      <tr>
        <td><strong>${esc(a.title||'Untitled auction')}</strong><span class="muted">#${esc(a.id)}</span></td>
        <td>${esc(productName(a.product_id))}</td>
        <td><strong>${money(a.current_bid)}</strong><span class="muted">Start ${money(a.starting_bid)}</span></td>
        <td>${esc(new Date(a.starts_at).toLocaleString())}</td>
        <td>${esc(new Date(a.ends_at).toLocaleString())}</td>
        <td><span class="status-pill status-${esc(a.status)}">${esc(a.status)}</span></td>
        <td><div class="actions"><button class="btn" data-edit="${esc(a.id)}">Edit</button>${a.status==='live'?`<button class="btn" data-end="${esc(a.id)}">End now</button>`:''}<button class="btn danger" data-remove="${esc(a.id)}">Remove</button></div></td>
      </tr>
    `).join(''):'<tr><td colspan="7" class="empty">No auctions found.</td></tr>';
    bindRows();
  }

  /** Open the Create Auction modal. */
  function openCreateModal(){
    $('auctionCreateForm').reset();
    $('createStatus').value='scheduled';
    $('createStartingBid').value='0';
    $('createIncrement').value='1';
    $('createAuctionMessage').textContent='';
    $('createAuctionMessage').className='auction-edit-message';
    $('auctionCreateModal').classList.remove('hidden');
    document.body.style.overflow='hidden';
    $('createProductId').focus();
  }

  /** Close the Create Auction modal. */
  function closeCreateModal(){
    $('auctionCreateModal').classList.add('hidden');
    document.body.style.overflow='';
  }

  /** Open the Edit Auction modal and populate it with the selected record. */
  function openEditModal(id){
    const auction=auctions.find(item=>String(item.id)===String(id));
    if(!auction) return;
    $('editAuctionId').value=auction.id;
    $('editProductId').value=String(auction.product_id);
    $('editTitle').value=auction.title||'';
    $('editDescription').value=auction.description||'';
    $('editStatus').value=auction.status||'scheduled';
    $('editStartsAt').value=toLocalInput(auction.starts_at);
    $('editEndsAt').value=toLocalInput(auction.ends_at);
    $('editStartingBid').value=auction.starting_bid??0;
    $('editIncrement').value=auction.minimum_increment??1;
    $('auctionEditSub').textContent=`Auction #${auction.id} · update the details and save changes.`;
    $('editAuctionMessage').textContent='';
    $('editAuctionMessage').className='auction-edit-message';
    $('auctionEditModal').classList.remove('hidden');
    document.body.style.overflow='hidden';
    $('editTitle').focus();
  }

  /** Close the Edit Auction modal. */
  function closeEditModal(){
    $('auctionEditModal').classList.add('hidden');
    document.body.style.overflow='';
  }

  /** Build and validate an auction RPC payload from a form prefix. */
  function buildPayload(prefix){
    const productId=Number($(prefix+'ProductId').value);
    const title=$(prefix+'Title').value.trim();
    const description=$(prefix+'Description').value.trim()||null;
    const status=$(prefix+'Status').value;
    const starts=new Date($(prefix+'StartsAt').value);
    const ends=new Date($(prefix+'EndsAt').value);
    const startingBid=Number($(prefix+'StartingBid').value);
    const increment=Number($(prefix+'Increment').value);
    if(!productId||!title) throw new Error('Product and title are required.');
    if(!Number.isFinite(starts.getTime())||!Number.isFinite(ends.getTime())||ends<=starts) throw new Error('End time must be after start time.');
    if(!Number.isFinite(startingBid)||startingBid<0) throw new Error('Starting bid must be 0 or greater.');
    if(!Number.isFinite(increment)||increment<=0) throw new Error('Minimum increment must be greater than 0.');
    return {p_product_id:productId,p_title:title,p_description:description,p_starts_at:starts.toISOString(),p_ends_at:ends.toISOString(),p_starting_bid:startingBid,p_minimum_increment:increment,p_status:status};
  }

  /** Create a new auction through the protected Admin RPC. */
  async function createAuction(event){
    event.preventDefault();
    const client=getClient();
    const button=$('auctionCreateForm').querySelector('button[type="submit"]');
    button.disabled=true;button.textContent='Creating...';
    try{
      const result=await wait(client.rpc('admin_create_auction',buildPayload('create')));
      if(result.error) throw result.error;
      $('createAuctionMessage').textContent='Auction created successfully.';
      $('createAuctionMessage').className='auction-edit-message success';
      await loadAuctions();
      setTimeout(closeCreateModal,400);
    }catch(error){
      $('createAuctionMessage').textContent=error.message||'Unable to create auction.';
      $('createAuctionMessage').className='auction-edit-message error';
    }finally{button.disabled=false;button.textContent='Create auction';}
  }

  /** Update an existing auction through the protected Admin RPC. */
  async function saveAuction(event){
    event.preventDefault();
    const client=getClient();
    const id=$('editAuctionId').value;
    const button=$('saveEditAuction');
    button.disabled=true;button.textContent='Saving changes...';
    try{
      if(!id) throw new Error('Auction ID is missing.');
      const result=await wait(client.rpc('admin_update_auction',{p_id:Number(id),...buildPayload('edit')}));
      if(result.error) throw result.error;
      $('editAuctionMessage').textContent='Auction updated successfully.';
      $('editAuctionMessage').className='auction-edit-message success';
      await loadAuctions();
      setTimeout(closeEditModal,400);
    }catch(error){
      $('editAuctionMessage').textContent=error.message||'Unable to update auction.';
      $('editAuctionMessage').className='auction-edit-message error';
    }finally{button.disabled=false;button.textContent='Save changes';}
  }

  /** End a live auction through the protected Admin RPC. */
  async function endAuction(id){
    if(!confirm('End this auction now?')) return;
    const result=await wait(getClient().rpc('admin_set_auction_status',{p_id:Number(id),p_status:'ended'}));
    if(result.error) return alert(`Unable to end auction: ${result.error.message}`);
    await loadAuctions();
  }

  /** Delete an auction through the protected Admin RPC. */
  async function removeAuction(id){
    if(!confirm('Remove this auction? This action cannot be undone.')) return;
    const result=await wait(getClient().rpc('admin_delete_auction',{p_id:Number(id)}));
    if(result.error) return alert(`Unable to remove auction: ${result.error.message}`);
    await loadAuctions();
  }

  /** Bind row action buttons. */
  function bindRows(){
    document.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>openEditModal(button.dataset.edit));
    document.querySelectorAll('[data-end]').forEach(button=>button.onclick=()=>endAuction(button.dataset.end));
    document.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>removeAuction(button.dataset.remove));
  }

  /** Bind modal close behavior. */
  function bindModalDismiss(){
    $('closeCreateAuction').onclick=closeCreateModal;
    $('cancelCreateAuction').onclick=closeCreateModal;
    $('closeEditAuction').onclick=closeEditModal;
    $('cancelEditAuction').onclick=closeEditModal;
    $('auctionCreateModal').onclick=event=>{if(event.target===$('auctionCreateModal'))closeCreateModal();};
    $('auctionEditModal').onclick=event=>{if(event.target===$('auctionEditModal'))closeEditModal();};
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeCreateModal();closeEditModal();}});
  }

  /** Initialize Auction Management after the shared Admin authentication page has initialized. */
  async function start(){
    try{
      if(!(await requireAdmin())) return;
      await loadProducts();
      await loadAuctions();
      $('newAuction').onclick=openCreateModal;
      $('auctionCreateForm').addEventListener('submit',createAuction);
      $('auctionEditForm').addEventListener('submit',saveAuction);
      $('auctionSearch').oninput=renderRows;
      $('auctionFilter').onchange=renderRows;
      $('refreshAuctions').onclick=async()=>{await loadProducts();await loadAuctions();};
      $('logout').onclick=async()=>{await getClient().auth.signOut({scope:'local'});location.replace('admin.html?loggedout='+Date.now());};
      getClient().auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')location.replace('admin.html');});
      bindModalDismiss();
    }catch(error){
      $('auctionRows').innerHTML=`<tr><td colspan="7" class="error">Unable to load auctions: ${esc(error.message||error)}</td></tr>`;
    }
  }

  document.addEventListener('DOMContentLoaded',start);
})();
