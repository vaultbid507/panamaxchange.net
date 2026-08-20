/**
 * PanamaXChange — dedicated auction edit screen.
 *
 * Process:
 * 1. Reuse the persistent Admin Supabase session.
 * 2. Verify the current user is an administrator.
 * 3. Read the auction ID from the URL query string.
 * 4. Load products and the selected auction.
 * 5. Populate the Product-style edit form.
 * 6. Validate dates, bids, and required fields.
 * 7. Persist the update to Supabase.
 * 8. Return to Auction Management after a successful save.
 */
(() => {
  const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZDNkY3B3Z2RkZ2NwY2wiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NjY2NzM0MSwiZXhwIjoxMjEwMjMzNDM0MX0.wOtr8Mxqz79BuXY1nMC0fbR0iAkuC3j282opFR9oZi0';
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'panamaxchange-auth' }
  });

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const wait = promise => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Check Supabase connection and RLS permissions.')), 12000))
  ]);

  const params = new URLSearchParams(location.search);
  const auctionId = params.get('id');
  let products = [];

  /** Require a valid Admin session and verify membership before loading data. */
  async function requireAdmin() {
    const { data, error } = await wait(db.auth.getSession());
    if (error || !data?.session) {
      location.replace('admin.html');
      return false;
    }
    const membership = await wait(db.from('admin_users').select('user_id').eq('user_id', data.session.user.id).maybeSingle());
    if (membership.error || !membership.data) {
      await db.auth.signOut({ scope: 'local' });
      location.replace('admin.html');
      return false;
    }
    return true;
  }

  /** Load the product list used by the auction selector. */
  async function loadProducts(selectedId) {
    const select = $('productId');
    select.innerHTML = '<option value="">Loading products...</option>';
    const result = await wait(db.from('products').select('id,name').order('name'));
    if (result.error) throw result.error;
    products = result.data || [];
    select.innerHTML = products.length
      ? products.map(product => `<option value="${esc(product.id)}">${esc(product.name)}</option>`).join('')
      : '<option value="">No products available</option>';
    if (selectedId != null) select.value = String(selectedId);
  }

  /** Convert an ISO timestamp into the local datetime-local input format. */
  function toLocalInput(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  /** Load the requested auction and populate every form field. */
  async function loadAuction() {
    if (!auctionId || !/^\d+$/.test(auctionId)) throw new Error('Missing or invalid auction ID.');
    const result = await wait(db.from('auctions').select('id,product_id,title,description,starts_at,ends_at,status,starting_bid,minimum_increment').eq('id', auctionId).maybeSingle());
    if (result.error) throw result.error;
    if (!result.data) throw new Error('Auction not found.');

    const auction = result.data;
    $('productId').value = String(auction.product_id);
    $('title').value = auction.title || '';
    $('description').value = auction.description || '';
    $('status').value = auction.status || 'scheduled';
    $('startsAt').value = toLocalInput(auction.starts_at);
    $('endsAt').value = toLocalInput(auction.ends_at);
    $('startingBid').value = auction.starting_bid ?? 0;
    $('increment').value = auction.minimum_increment ?? 1;
    $('pageSubtitle').textContent = `Auction #${auction.id} · update the details and save.`;
  }

  /** Validate and normalize the form values for the database update. */
  function buildPayload() {
    const starts = new Date($('startsAt').value);
    const ends = new Date($('endsAt').value);
    const payload = {
      product_id: Number($('productId').value),
      title: $('title').value.trim(),
      description: $('description').value.trim() || null,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      starting_bid: Number($('startingBid').value),
      minimum_increment: Number($('increment').value),
      status: $('status').value
    };

    if (!payload.product_id || !payload.title) throw new Error('Product and title are required.');
    if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new Error('End time must be after start time.');
    if (!Number.isFinite(payload.starting_bid) || payload.starting_bid < 0) throw new Error('Starting bid must be 0 or greater.');
    if (!Number.isFinite(payload.minimum_increment) || payload.minimum_increment <= 0) throw new Error('Minimum increment must be greater than 0.');
    return payload;
  }

  /** Persist the edited auction and navigate back to the management table. */
  async function save(event) {
    event.preventDefault();
    const button = $('saveAuction');
    button.disabled = true;
    button.textContent = 'Saving changes...';
    $('message').textContent = '';
    $('message').className = 'message';

    try {
      if (!auctionId) throw new Error('Auction ID is missing.');
      const result = await wait(db.from('auctions').update(buildPayload()).eq('id', auctionId));
      if (result.error) throw result.error;
      $('message').textContent = 'Auction updated successfully. Returning to Auction Management...';
      $('message').className = 'message success';
      setTimeout(() => location.replace('auctions-admin.html?updated=' + encodeURIComponent(auctionId)), 500);
    } catch (error) {
      $('message').textContent = error.message || 'Unable to update auction.';
      $('message').className = 'message error';
    } finally {
      button.disabled = false;
      button.textContent = 'Save changes';
    }
  }

  /** Initialize authentication, load the auction, and attach UI events. */
  async function start() {
    try {
      if (!(await requireAdmin())) return;
      await loadProducts();
      await loadAuction();
      $('auctionEditForm').addEventListener('submit', save);
      $('logout').addEventListener('click', async () => {
        await db.auth.signOut({ scope: 'local' });
        location.replace('admin.html');
      });
      db.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') location.replace('admin.html');
      });
    } catch (error) {
      $('message').textContent = error.message || 'Unable to load auction.';
      $('message').className = 'message error';
    }
  }

  start();
})();
