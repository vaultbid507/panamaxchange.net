/**
 * PanamaXChange — professional auction administration.
 *
 * Uses the same Supabase administrator session/storage as the Admin dashboard.
 * Provides Product-style create workflow, dedicated-screen editing, search,
 * status filtering, summary counters, auction actions, and automatic sign-out.
 */
(() => {
  const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZ2J4bXBpendsdmdkZGdjcGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjczNDEsImV4cCI6MjEwMjIzMzQxMX0.wOtr8Mxqz79BuXY1nMC0fbR0iAkuC3j282opFR9oZi0';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'panamaxchange-auth' } });
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
  const money = v => Number(v || 0).toLocaleString('en-US', {style:'currency',currency:'USD'});
  const wait = p => Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Check Supabase connection and RLS permissions.')), 12000))]);
  let auctions = [], products = [];

  /** Verify the current session belongs to an administrator. */
  async function requireAdmin() {
    const {data, error} = await wait(db.auth.getSession());
    if (error || !data?.session) { location.replace('admin.html'); return false; }
    const r = await wait(db.from('admin_users').select('user_id').eq('user_id', data.session.user.id).maybeSingle());
    if (r.error || !r.data) { await db.auth.signOut({scope:'local'}); location.replace('admin.html'); return false; }
    return true;
  }

  /** Load products available for auction assignment. */
  async function loadProducts() {
    const s = $('productId');
    if (!s) return;
    s.innerHTML = '<option value="">Loading products...</option>';
    const r = await wait(db.from('products').select('id,name').order('name'));
    if (r.error) { s.innerHTML = '<option value="">Products unavailable</option>'; throw r.error; }
    products = r.data || [];
    s.innerHTML = products.length ? products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('') : '<option value="">No products available</option>';
  }

  /** Load auctions from Supabase and refresh the table and counters. */
  async function loadAuctions() {
    $('auctionRows').innerHTML = '<tr><td colspan="7" class="empty">Loading auctions...</td></tr>';
    const r = await wait(db.from('auctions').select('id,product_id,title,description,starts_at,ends_at,status,starting_bid,minimum_increment,current_bid,created_at').order('created_at',{ascending:false}));
    if (r.error) throw r.error;
    auctions = r.data || [];
    updateSummary();
    render();
  }

  /** Refresh total/live/scheduled/ended counters. */
  function updateSummary() {
    $('auctionTotal').textContent = auctions.length;
    $('auctionLive').textContent = auctions.filter(a => a.status === 'live').length;
    $('auctionScheduled').textContent = auctions.filter(a => a.status === 'scheduled').length;
    $('auctionEnded').textContent = auctions.filter(a => a.status === 'ended').length;
  }

  /** Return a safe display name for an auction product. */
  function productName(id) { return products.find(p => String(p.id) === String(id))?.name || 'Product'; }

  /** Render the filtered auction management table with navigation actions. */
  function render() {
    const q = ($('auctionSearch').value || '').trim().toLowerCase();
    const f = $('auctionFilter').value;
    const list = auctions.filter(a => (!q || `${a.title || ''} ${productName(a.product_id)}`.toLowerCase().includes(q)) && (!f || a.status === f));
    $('auctionRows').innerHTML = list.length ? list.map(a => `<tr><td><strong>${esc(a.title || 'Untitled auction')}</strong><span class="muted">#${esc(a.id)}</span></td><td>${esc(productName(a.product_id))}</td><td><strong>${money(a.current_bid)}</strong><span class="muted">Start ${money(a.starting_bid)}</span></td><td>${esc(new Date(a.starts_at).toLocaleString())}</td><td>${esc(new Date(a.ends_at).toLocaleString())}</td><td><span class="status-pill status-${esc(a.status)}">${esc(a.status)}</span></td><td><div class="actions"><button class="btn" data-edit="${esc(a.id)}">Edit</button>${a.status === 'live' ? `<button class="btn" data-end="${esc(a.id)}">End now</button>` : ''}<button class="btn danger" data-remove="${esc(a.id)}">Remove</button></div></td></tr>`).join('') : '<tr><td colspan="7" class="empty">No auctions found.</td></tr>';
    bindRows();
  }

  /** Open the shared Product-style create form on the current page. */
  function newAuction() {
    $('auctionForm').reset();
    $('auctionId').value='';
    $('status').value='scheduled';
    $('startingBid').value='0';
    $('increment').value='1';
    $('auctionFormTitle').textContent='Add auction';
    $('auctionMessage').textContent='';
    $('auctionFormPanel').classList.remove('hidden');
    $('productId').focus();
  }

  /** Navigate to the dedicated auction edit screen. */
  function editAuction(id) {
    location.href = `auction-edit.html?id=${encodeURIComponent(id)}`;
  }

  /** Validate and normalize values used by the create form. */
  function payload() {
    const s = new Date($('startsAt').value), e = new Date($('endsAt').value);
    if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime()) || e <= s) throw new Error('End time must be after start time.');
    const p = { product_id:Number($('productId').value), title:$('title').value.trim(), description:$('description').value.trim()||null, starts_at:s.toISOString(), ends_at:e.toISOString(), starting_bid:Number($('startingBid').value), minimum_increment:Number($('increment').value), status:$('status').value };
    if (!p.product_id || !p.title) throw new Error('Product and title are required.');
    if (!Number.isFinite(p.starting_bid) || p.starting_bid < 0) throw new Error('Starting bid must be 0 or greater.');
    if (!Number.isFinite(p.minimum_increment) || p.minimum_increment <= 0) throw new Error('Minimum increment must be greater than 0.');
    return p;
  }

  /** Save a new auction from the management page and refresh the table. */
  async function saveAuction(e) {
    e.preventDefault();
    const b = $('auctionForm').querySelector('button[type="submit"]');
    b.disabled=true;
    b.textContent='Saving...';
    $('auctionMessage').textContent='';
    try {
      const r=await wait(db.from('auctions').insert(payload()));
      if(r.error) throw r.error;
      $('auctionMessage').textContent='Auction created successfully.';
      $('auctionMessage').className='message success';
      $('auctionForm').reset();
      $('auctionId').value='';
      $('auctionFormTitle').textContent='Add auction';
      $('status').value='scheduled';
      await loadAuctions();
    } catch(err) {
      $('auctionMessage').textContent=err.message||'Unable to save auction.';
      $('auctionMessage').className='message error';
    } finally {
      b.disabled=false;
      b.textContent='Save auction';
    }
  }

  /** End an active auction immediately. */
  async function endAuction(id) { if(!confirm('End this auction now?')) return; const r=await wait(db.from('auctions').update({status:'ended',ends_at:new Date().toISOString()}).eq('id',id)); if(r.error) return alert(r.error.message); await loadAuctions(); }

  /** Delete an auction after confirmation. */
  async function removeAuction(id) { if(!confirm('Remove this auction? This action cannot be undone.')) return; const r=await wait(db.from('auctions').delete().eq('id',id)); if(r.error) return alert(r.error.message); await loadAuctions(); }

  /** Bind table action buttons after every render. */
  function bindRows(){
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAuction(b.dataset.edit));
    document.querySelectorAll('[data-end]').forEach(b=>b.onclick=()=>endAuction(b.dataset.end));
    document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeAuction(b.dataset.remove));
  }

  /** Initialize authentication, products, auctions and page controls. */
  async function start(){
    try {
      if(!(await requireAdmin())) return;
      await loadProducts();
      await loadAuctions();
      $('newAuction').onclick=newAuction;
      $('cancelAuction').onclick=()=>$('auctionFormPanel').classList.add('hidden');
      $('auctionForm').addEventListener('submit',saveAuction);
      $('auctionSearch').oninput=render;
      $('auctionFilter').onchange=render;
      $('refreshAuctions').onclick=async()=>{await loadProducts();await loadAuctions()};
      $('logout').onclick=async()=>{await db.auth.signOut({scope:'local'});location.replace('admin.html')};
      db.auth.onAuthStateChange(e=>{if(e==='SIGNED_OUT')location.replace('admin.html')});
    } catch(err) {
      $('auctionRows').innerHTML=`<tr><td colspan="7" class="error">Unable to load auctions: ${esc(err.message||err)}</td></tr>`;
    }
  }
  start();
})();
