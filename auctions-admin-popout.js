/**
 * PanamaXChange — auction management with Product-style popout editing.
 *
 * Process:
 * 1. Reuse the persistent Admin Supabase session.
 * 2. Verify administrator access.
 * 3. Load products and auctions.
 * 4. Render searchable, filterable auction rows.
 * 5. Open New Auction in a centered modal.
 * 6. Open Edit Auction in a separate centered modal over the management page.
 * 7. Validate and persist changes through Supabase.
 * 8. Refresh the table after every successful mutation.
 */
(() => {
  const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZDNkY3B3Z2RkZ2NwY2wiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NjY2NzM0MSwiZXhwIjoxMjEwMjMzNDM0MX0.wOtr8Mxqz79BuXY1nMC0fbR0iAkuC3j282opFR9oZi0';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'panamaxchange-auth' }
  });

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[c]));
  const money = value => Number(value || 0).toLocaleString('en-US', { style:'currency', currency:'USD' });
  const wait = promise => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Check Supabase connection and RLS permissions.')), 12000))
  ]);

  let auctions = [];
  let products = [];

  /** Verify that the current browser session belongs to an administrator. */
  async function requireAdmin() {
    const { data, error } = await wait(db.auth.getSession());
    if (error || !data?.session) {
      location.replace('admin.html');
      return false;
    }
    const membership = await wait(db.from('admin_users').select('user_id').eq('user_id', data.session.user.id).maybeSingle());
    if (membership.error || !membership.data) {
      await db.auth.signOut({ scope:'local' });
      location.replace('admin.html');
      return false;
    }
    return true;
  }

  /** Convert an ISO timestamp into a local datetime-local input value. */
  function toLocalInput(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0,16);
  }

  /** Load products used by auction create/edit selectors. */
  async function loadProducts() {
    const selects = [$('createProductId'), $('editProductId')].filter(Boolean);
    selects.forEach(select => { select.innerHTML = '<option value="">Loading products...</option>'; });
    const result = await wait(db.from('products').select('id,name').order('name'));
    if (result.error) throw result.error;
    products = result.data || [];
    const options = products.length
      ? products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')
      : '<option value="">No products available</option>';
    selects.forEach(select => { select.innerHTML = options; });
  }

  /** Load all auctions and refresh counters and the management table. */
  async function loadAuctions() {
    $('auctionRows').innerHTML = '<tr><td colspan="7" class="empty">Loading auctions...</td></tr>';
    const result = await wait(db.from('auctions').select('id,product_id,title,description,starts_at,ends_at,status,starting_bid,minimum_increment,current_bid,created_at').order('created_at',{ascending:false}));
    if (result.error) throw result.error;
    auctions = result.data || [];
    updateSummary();
    renderRows();
  }

  /** Update auction summary counters. */
  function updateSummary() {
    $('auctionTotal').textContent = auctions.length;
    $('auctionLive').textContent = auctions.filter(a => a.status === 'live').length;
    $('auctionScheduled').textContent = auctions.filter(a => a.status === 'scheduled').length;
    $('auctionEnded').textContent = auctions.filter(a => a.status === 'ended').length;
  }

  /** Resolve a product ID into a safe display name. */
  function productName(id) {
    return products.find(p => String(p.id) === String(id))?.name || 'Product';
  }

  /** Render auction table rows according to current search and status filters. */
  function renderRows() {
    const query = ($('auctionSearch').value || '').trim().toLowerCase();
    const filter = $('auctionFilter').value;
    const visible = auctions.filter(auction => {
      const text = `${auction.title || ''} ${productName(auction.product_id)}`.toLowerCase();
      return (!query || text.includes(query)) && (!filter || auction.status === filter);
    });

    $('auctionRows').innerHTML = visible.length ? visible.map(a => `
      <tr>
        <td><strong>${esc(a.title || 'Untitled auction')}</strong><span class="muted">#${esc(a.id)}</span></td>
        <td>${esc(productName(a.product_id))}</td>
        <td><strong>${money(a.current_bid)}</strong><span class="muted">Start ${money(a.starting_bid)}</span></td>
        <td>${esc(new Date(a.starts_at).toLocaleString())}</td>
        <td>${esc(new Date(a.ends_at).toLocaleString())}</td>
        <td><span class="status-pill status-${esc(a.status)}">${esc(a.status)}</span></td>
        <td><div class="actions"><button class="btn" data-edit="${esc(a.id)}">Edit</button>${a.status === 'live' ? `<button class="btn" data-end="${esc(a.id)}">End now</button>` : ''}<button class="btn danger" data-remove="${esc(a.id)}">Remove</button></div></td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="empty">No auctions found.</td></tr>';

    bindRows();
  }

  /** Open the New Auction popout and reset its fields. */
  function openCreateModal() {
    $('auctionCreateForm').reset();
    $('createStatus').value = 'scheduled';
    $('createStartingBid').value = '0';
    $('createIncrement').value = '1';
    $('createAuctionMessage').textContent = '';
    $('createAuctionMessage').className = 'auction-edit-message';
    $('auctionCreateModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('createProductId').focus();
  }

  /** Close the New Auction popout. */
  function closeCreateModal() {
    $('auctionCreateModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  /** Open the Edit Auction popout and populate it from the selected auction. */
  function openEditModal(id) {
    const auction = auctions.find(item => String(item.id) === String(id));
    if (!auction) return;
    $('editAuctionId').value = auction.id;
    $('editProductId').value = String(auction.product_id);
    $('editTitle').value = auction.title || '';
    $('editDescription').value = auction.description || '';
    $('editStatus').value = auction.status || 'scheduled';
    $('editStartsAt').value = toLocalInput(auction.starts_at);
    $('editEndsAt').value = toLocalInput(auction.ends_at);
    $('editStartingBid').value = auction.starting_bid ?? 0;
    $('editIncrement').value = auction.minimum_increment ?? 1;
    $('auctionEditSub').textContent = `Auction #${auction.id} · update the details and save changes.`;
    $('editAuctionMessage').textContent = '';
    $('editAuctionMessage').className = 'auction-edit-message';
    $('auctionEditModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('editTitle').focus();
  }

  /** Close the Edit Auction popout. */
  function closeEditModal() {
    $('auctionEditModal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  /** Build and validate an auction payload from any supplied field IDs. */
  function buildPayload(prefix) {
    const productId = Number($(prefix+'ProductId').value);
    const title = $(prefix+'Title').value.trim();
    const description = $(prefix+'Description').value.trim() || null;
    const status = $(prefix+'Status').value;
    const starts = new Date($(prefix+'StartsAt').value);
    const ends = new Date($(prefix+'EndsAt').value);
    const startingBid = Number($(prefix+'StartingBid').value);
    const increment = Number($(prefix+'Increment').value);

    if (!productId || !title) throw new Error('Product and title are required.');
    if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new Error('End time must be after start time.');
    if (!Number.isFinite(startingBid) || startingBid < 0) throw new Error('Starting bid must be 0 or greater.');
    if (!Number.isFinite(increment) || increment <= 0) throw new Error('Minimum increment must be greater than 0.');

    return {
      product_id: productId,
      title,
      description,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      starting_bid: startingBid,
      minimum_increment: increment,
      status
    };
  }

  /** Create a new auction and close the create popout when successful. */
  async function createAuction(event) {
    event.preventDefault();
    const button = $('auctionCreateForm').querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Creating...';
    $('createAuctionMessage').textContent = '';
    try {
      const result = await wait(db.from('auctions').insert(buildPayload('create')));
      if (result.error) throw result.error;
      $('createAuctionMessage').textContent = 'Auction created successfully.';
      $('createAuctionMessage').className = 'auction-edit-message success';
      await loadAuctions();
      setTimeout(closeCreateModal, 400);
    } catch (error) {
      $('createAuctionMessage').textContent = error.message || 'Unable to create auction.';
      $('createAuctionMessage').className = 'auction-edit-message error';
    } finally {
      button.disabled = false;
      button.textContent = 'Create auction';
    }
  }

  /** Update an existing auction from the Edit popout and refresh the table. */
  async function saveAuction(event) {
    event.preventDefault();
    const id = $('editAuctionId').value;
    const button = $('saveEditAuction');
    button.disabled = true;
    button.textContent = 'Saving changes...';
    $('editAuctionMessage').textContent = '';
    try {
      if (!id) throw new Error('Auction ID is missing.');
      const result = await wait(db.from('auctions').update(buildPayload('edit')).eq('id', id));
      if (result.error) throw result.error;
      $('editAuctionMessage').textContent = 'Auction updated successfully.';
      $('editAuctionMessage').className = 'auction-edit-message success';
      await loadAuctions();
      setTimeout(closeEditModal, 400);
    } catch (error) {
      $('editAuctionMessage').textContent = error.message || 'Unable to update auction.';
      $('editAuctionMessage').className = 'auction-edit-message error';
    } finally {
      button.disabled = false;
      button.textContent = 'Save changes';
    }
  }

  /** End a live auction immediately. */
  async function endAuction(id) {
    if (!confirm('End this auction now?')) return;
    const result = await wait(db.from('auctions').update({ status:'ended', ends_at:new Date().toISOString() }).eq('id', id));
    if (result.error) return alert(`Unable to end auction: ${result.error.message}`);
    await loadAuctions();
  }

  /** Delete an auction after explicit confirmation. */
  async function removeAuction(id) {
    if (!confirm('Remove this auction? This action cannot be undone.')) return;
    const result = await wait(db.from('auctions').delete().eq('id', id));
    if (result.error) return alert(`Unable to remove auction: ${result.error.message}`);
    await loadAuctions();
  }

  /** Attach edit/end/remove handlers after each table render. */
  function bindRows() {
    document.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => openEditModal(button.dataset.edit));
    document.querySelectorAll('[data-end]').forEach(button => button.onclick = () => endAuction(button.dataset.end));
    document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => removeAuction(button.dataset.remove));
  }

  /** Handle Escape and backdrop clicks for the modal dialogs. */
  function bindModalDismiss() {
    $('closeCreateAuction').onclick = closeCreateModal;
    $('cancelCreateAuction').onclick = closeCreateModal;
    $('closeEditAuction').onclick = closeEditModal;
    $('cancelEditAuction').onclick = closeEditModal;
    $('auctionCreateModal').onclick = event => { if (event.target === $('auctionCreateModal')) closeCreateModal(); };
    $('auctionEditModal').onclick = event => { if (event.target === $('auctionEditModal')) closeEditModal(); };
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeCreateModal();
        closeEditModal();
      }
    });
  }

  /** Initialize the entire Auction Management page. */
  async function start() {
    try {
      if (!(await requireAdmin())) return;
      await loadProducts();
      await loadAuctions();
      $('newAuction').onclick = openCreateModal;
      $('auctionCreateForm').addEventListener('submit', createAuction);
      $('auctionEditForm').addEventListener('submit', saveAuction);
      $('auctionSearch').oninput = renderRows;
      $('auctionFilter').onchange = renderRows;
      $('refreshAuctions').onclick = async () => { await loadProducts(); await loadAuctions(); };
      $('logout').onclick = async () => { await db.auth.signOut({ scope:'local' }); location.replace('admin.html'); };
      db.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') location.replace('admin.html'); });
      bindModalDismiss();
    } catch (error) {
      $('auctionRows').innerHTML = `<tr><td colspan="7" class="error">Unable to load auctions: ${esc(error.message || error)}</td></tr>`;
    }
  }

  start();
})();
