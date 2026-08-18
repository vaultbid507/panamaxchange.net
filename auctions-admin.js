/**
 * PanamaXChange — professional auction administration.
 *
 * Responsibilities:
 * - Authenticate the current administrator with the shared admin session.
 * - Load products used as auction inventory.
 * - Load, search, filter, summarize, create, edit, start/end, cancel, and
 *   delete auction records.
 * - Reuse the same form-panel workflow used by Product Management: New
 *   Auction opens a blank form; Edit populates that same form; Save persists;
 *   Cancel closes/resets it.
 * - Keep the page synchronized after authentication changes and refreshes.
 */
(() => {
  const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im
FlZDNkY3B3Z2RkZ2NwY2wiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NjY2NzM0MSwiZXhwIjoxMjEwMjMzNDM0MX0.wOtr8Mxqz79BuXY1nMC0fbR0iAkuC3j282opFR9oZi0';
  const STORAGE_KEY = 'panamaxchange-auth';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORAGE_KEY }
  });

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const money = value => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const wait = promise => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Check Supabase connection and RLS permissions.')), 12000))
  ]);

  let auctions = [];
  let products = [];

  /** Verify that the browser has an authenticated administrator session. */
  async function requireAdmin() {
    const session = await wait(db.auth.getSession());
    if (!session.data?.session) {
      location.replace('admin.html');
      return false;
    }
    const membership = await wait(
      db.from('admin_users').select('user_id').eq('user_id', session.data.session.user.id).maybeSingle()
    );
    if (membership.error || !membership.data) {
      await db.auth.signOut({ scope: 'local' });
      location.replace('admin.html');
      return false;
    }
    return true;
  }

  /** Load products that can be selected as the auction item. */
  async function loadProducts() {
    const select = $('productId');
    if (!select) return;
    select.innerHTML = '<option value="">Loading products...</option>';
    const result = await wait(db.from('products').select('id,name').order('name'));
    if (result.error) {
      select.innerHTML = '<option value="">Products unavailable</option>';
      throw result.error;
    }
    products = result.data || [];
    select.innerHTML = products.length
      ? products.map(product => `<option value="${esc(product.id)}">${esc(product.name)}</option>`).join('')
      : '<option value="">No products available</option>';
  }

  /** Load all auctions and refresh summary counters and table rows. */
  async function loadAuctions() {
    const rows = $('auctionRows');
    if (rows) rows.innerHTML = '<tr><td colspan="7" class="empty">Loading auctions...</td></tr>';
    const result = await wait(db.from('auctions').select('id,product_id,title,description,starts_at,ends_at,status,starting_bid,minimum_increment,current_bid,created_at').order('created_at', { ascending: false }));
    if (result.error) throw result.error;
    auctions = result.data || [];
    updateSummary();
    renderAuctions();
  }

  /** Update dashboard counters from the currently loaded auction set. */
  function updateSummary() {
    $('auctionTotal').textContent = auctions.length;
    $('auctionLive').textContent = auctions.filter(a => a.status === 'live').length;
    $('auctionScheduled').textContent = auctions.filter(a => a.status === 'scheduled').length;
    $('auctionEnded').textContent = auctions.filter(a => a.status === 'ended').length;
  }

  /** Determine the product name for a given auction. */
  function productName(id) {
    return products.find(product => String(product.id) === String(id))?.name || 'Product';
  }

  /** Render filtered auction rows using the same management-table pattern as Products. */
  function renderAuctions() {
    const rows = $('auctionRows');
    if (!rows) return;
    const search = ($('auctionSearch').value || '').trim().toLowerCase();
    const filter = $('auctionFilter').value;
    const visible = auctions.filter(auction => {
      const haystack = `${auction.title || ''} ${productName(auction.product_id)}`.toLowerCase();
      return (!search || haystack.includes(search)) && (!filter || auction.status === filter);
    });

    rows.innerHTML = visible.length ? visible.map(auction => `
      <tr>
        <td><strong>${esc(auction.title || 'Untitled auction')}</strong><span class="muted">#${esc(auction.id)}</span></td>
        <td>${esc(productName(auction.product_id))}</td>
        <td><strong>${money(auction.current_bid)}</strong><span class="muted">Start ${money(auction.starting_bid)}</span></td>
        <td>${esc(new Date(auction.starts_at).toLocaleString())}</td>
        <td>${esc(new Date(auction.ends_at).toLocaleString())}</td>
        <td><span class="status-pill status-${esc(auction.status)}">${esc(auction.status)}</span></td>
        <td><div class="actions"><button class="btn" data-edit="${esc(auction.id)}">Edit</button>${auction.status === 'live' ? `<button class="btn" data-end="${esc(auction.id)}">End now</button>` : ''}<button class="btn danger" data-remove="${esc(auction.id)}">Remove</button></div></td>
      </tr>`).join('') : '<tr><td colspan="7" class="empty">No auctions found.</td></tr>';

    bindRows();
  }

  /** Open the shared auction form in create mode. */
  function newAuction() {
    $('auctionId').value = '';
    $('auctionForm').reset();
    $('status').value = 'scheduled';
    $('startingBid').value = '0';
    $('increment').value = '1';
    $('auctionFormTitle').textContent = 'Add auction';
    $('auctionMessage').textContent = '';
    $('auctionFormPanel').classList.remove('hidden');
    $('productId').focus();
  }

  /** Populate the shared auction form with an existing auction, matching Product Edit behavior. */
  function editAuction(id) {
    const auction = auctions.find(item => String(item.id) === String(id));
    if (!auction) return;
    $('auctionId').value = auction.id;
    $('productId').value = auction.product_id;
    $('title').value = auction.title || '';
    $('description').value = auction.description || '';
    $('status').value = auction.status || 'scheduled';
    $('startsAt').value = new Date(auction.starts_at).toISOString().slice(0, 16);
    $('endsAt').value = new Date(auction.ends_at).toISOString().slice(0, 16);
    $('startingBid').value = auction.starting_bid ?? 0;
    $('increment').value = auction.minimum_increment ?? 1;
    $('auctionFormTitle').textContent = 'Edit auction';
    $('auctionMessage').textContent = '';
    $('auctionFormPanel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Validate the auction form and return the normalized database payload. */
  function payload() {
    const starts = new Date($('startsAt').value);
    const ends = new Date($('endsAt').value);
    const data = {
      product_id: Number($('productId').value),
      title: $('title').value.trim(),
      description: $('description').value.trim() || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      starting_bid: Number($('startingBid').value),
      minimum_increment: Number($('increment').value),
      status: $('status').value
    };
    if (!data.product_id || !data.title) throw new Error('Product and title are required.');
    if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new Error('End time must be after start time.');
    if (!Number.isFinite(data.starting_bid) || data.starting_bid < 0) throw new Error('Starting bid must be 0 or greater.');
    if (!Number.isFinite(data.minimum_increment) || data.minimum_increment <= 0) throw new Error('Minimum increment must be greater than 0.');
    return data;
  }

  /** Save a new or edited auction and return the form to a clean state. */
  async function saveAuction(event) {
    event.preventDefault();
    const button = $('auctionForm').querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving...';
    $('auctionMessage').textContent = '';
    try {
      const data = payload();
      const id = $('auctionId').value;
      const result = id
        ? await wait(db.from('auctions').update(data).eq('id', id))
        : await wait(db.from('auctions').insert(data));
      if (result.error) throw result.error;
      $('auctionMessage').textContent = id ? 'Auction updated successfully.' : 'Auction created successfully.';
      $('auctionMessage').className = 'message success';
      $('auctionForm').reset();
      $('auctionId').value = '';
      $('auctionFormTitle').textContent = 'Add auction';
      $('status').value = 'scheduled';
      await loadAuctions();
    } catch (error) {
      $('auctionMessage').textContent = error.message || 'Unable to save auction.';
      $('auctionMessage').className = 'message error';
    } finally {
      button.disabled = false;
      button.textContent = 'Save auction';
    }
  }

  /** End an auction immediately while preserving its history. */
  async function endAuction(id) {
    if (!confirm('End this auction now?')) return;
    const result = await wait(db.from('auctions').update({ status: 'ended', ends_at: new Date().toISOString() }).eq('id', id));
    if (result.error) return alert(`Unable to end auction: ${result.error.message}`);
    await loadAuctions();
  }

  /** Remove an auction after explicit confirmation. */
  async function removeAuction(id) {
    if (!confirm('Remove this auction? This action cannot be undone.')) return;
    const result = await wait(db.from('auctions').delete().eq('id', id));
    if (result.error) return alert(`Unable to remove auction: ${result.error.message}`);
    await loadAuctions();
  }

  /** Bind row actions after every table render. */
  function bindRows() {
    document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => editAuction(button.dataset.edit));
    document.querySelectorAll('[data-end]').forEach(button => button.onclick = () => endAuction(button.dataset.end));
    document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => removeAuction(button.dataset.remove));
  }

  /** Initialize the auction administration page. */
  async function start() {
    try {
      if (!(await requireAdmin())) return;
      await loadProducts();
      await loadAuctions();
      $('newAuction').onclick = newAuction;
      $('cancelAuction').onclick = () => $('auctionFormPanel').classList.add('hidden');
      $('auctionForm').addEventListener('submit', saveAuction);
      $('auctionSearch').oninput = renderAuctions;
      $('auctionFilter').onchange = renderAuctions;
      $('refreshAuctions').onclick = async () => { await loadProducts(); await loadAuctions(); };
      $('logout').onclick = async () => { await db.auth.signOut({ scope: 'local' }); location.replace('admin.html'); };
      db.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') location.replace('admin.html'); });
    } catch (error) {
      const rows = $('auctionRows');
      if (rows) rows.innerHTML = `<tr><td colspan="7" class="error">Unable to load auctions: ${esc(error.message || error)}</td></tr>`;
    }
  }

  start();
})();