/**
 * PanamaXChange — customer-facing live auction browser.
 *
 * Responsibilities:
 * - Reuse the single storefront authentication client exposed by
 *   `PanamaXChangeAuth`.
 * - Load live auctions together with their linked product image/name.
 * - Render auction cards, current prices, minimum next bids, and countdowns.
 * - Require a registered session before opening the bid dialog or placing a bid.
 * - Load server-validated bid history and refresh auction state after a bid.
 * - Surface actionable errors instead of leaving the page permanently loading.
 */
(() => {
  const auth = window.PanamaXChangeAuth;
  const supabaseClient = auth?.client;
  const grid = document.getElementById('auctionGrid');
  const modal = document.getElementById('bidModal');
  const closeBid = document.getElementById('closeBid');
  const submit = document.getElementById('submitBid');
  const amount = document.getElementById('bidAmount');
  const message = document.getElementById('bidMessage');
  const history = document.getElementById('bidHistory');
  let selected = null;
  let auctions = [];

  /** Escape values before inserting database/user content into HTML. */
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  /** Format a numeric auction value as USD. */
  const money = value => Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  /** Return a human-readable countdown until an auction ends. */
  function countdown(end) {
    const ms = new Date(end).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return 'Ended';
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return days ? `${days}d ${hours}h ${minutes}m` : hours ? `${hours}h ${minutes}m ${secs}s` : `${minutes}m ${secs}s`;
  }

  /** Render a clear failure state in the auction grid. */
  function showError(error) {
    console.error('[PanamaXChange auctions]', error);
    if (grid) {
      grid.innerHTML = `<div class="loading">Unable to load live auctions: ${esc(error?.message || error || 'Unknown error')}. <button type="button" class="secondary-button" id="retryAuctions">Retry</button></div>`;
      document.getElementById('retryAuctions')?.addEventListener('click', loadAuctions);
    }
  }

  /** Load current live auctions from Supabase and render them. */
  async function loadAuctions() {
    if (!grid) return;
    if (!supabaseClient) {
      showError(new Error('Shared storefront authentication client is unavailable.'));
      return;
    }

    grid.innerHTML = '<div class="loading">Loading live auctions...</div>';

    try {
      const result = await supabaseClient
        .from('auctions')
        .select('id,title,description,starts_at,ends_at,starting_bid,minimum_increment,current_bid,product_id,products(name,image_url)')
        .eq('status', 'live')
        .order('ends_at', { ascending: true });

      if (result.error) throw result.error;

      auctions = result.data || [];
      if (!auctions.length) {
        grid.innerHTML = '<div class="loading">No live auctions right now. Check back soon.</div>';
        return;
      }

      renderAuctions();
    } catch (error) {
      showError(error);
    }
  }

  /** Render the currently loaded auction records as customer-facing cards. */
  function renderAuctions() {
    grid.innerHTML = auctions.map(auction => {
      const image = auction.products?.image_url
        ? `<img class="auction-image" src="${esc(auction.products.image_url)}" alt="${esc(auction.title || auction.products?.name || 'Auction item')}" loading="lazy">`
        : '<div class="auction-image" aria-hidden="true"></div>';
      const min = Math.max(
        Number(auction.starting_bid) || 0,
        (Number(auction.current_bid) || 0) + (Number(auction.minimum_increment) || 1)
      );
      return `<article class="auction-card">
        <div>${image}</div>
        <div class="auction-body">
          <p class="eyebrow">LIVE AUCTION</p>
          <h3>${esc(auction.title || auction.products?.name || 'Auction')}</h3>
          <p class="auction-desc">${esc(auction.description || auction.products?.name || '')}</p>
          <div class="auction-meta">
            <div><small>Current bid</small><strong>${money(auction.current_bid)}</strong></div>
            <div><small>Ends in</small><strong class="countdown" data-end="${esc(auction.ends_at)}">${countdown(auction.ends_at)}</strong></div>
          </div>
          <button class="primary-button full-width bid-open" data-id="${esc(auction.id)}" data-min="${min}">Bid from ${money(min)} →</button>
        </div>
      </article>`;
    }).join('');

    grid.querySelectorAll('.bid-open').forEach(button => {
      button.addEventListener('click', async () => {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
          message.textContent = error.message;
          return;
        }
        if (!data?.session) {
          const user = await window.panamaxRequireAuth?.();
          if (!user) return;
        }
        const auction = auctions.find(item => String(item.id) === String(button.dataset.id));
        if (auction) openBid(auction, Number(button.dataset.min));
      });
    });
  }

  /** Open the bid dialog for a selected auction. */
  function openBid(auction, minimum) {
    selected = auction;
    message.textContent = '';
    amount.value = Number(minimum).toFixed(2);
    amount.min = Number(minimum).toFixed(2);
    document.getElementById('bidTitle').textContent = auction.title || auction.products?.name || 'Auction';
    document.getElementById('bidMinimum').textContent = `Minimum next bid: ${money(minimum)}`;
    modal.classList.remove('hidden');
    loadHistory(auction.id);
  }

  /** Load recent bids for the selected auction through the secure RPC. */
  async function loadHistory(auctionId) {
    history.innerHTML = '<span>Loading…</span>';
    const result = await supabaseClient.rpc('get_auction_bids', { p_auction_id: auctionId });
    if (result.error) {
      history.innerHTML = `<span>${esc(result.error.message || 'Bid history unavailable.')}</span>`;
      return;
    }
    history.innerHTML = result.data?.length
      ? result.data.map(bid => `<div class="bid-history-row"><strong>${money(bid.amount)}</strong><span>${new Date(bid.created_at).toLocaleString()}</span></div>`).join('')
      : '<span>No bids yet.</span>';
  }

  /** Submit a server-validated bid for the selected auction. */
  async function placeBid() {
    if (!selected) return;
    submit.disabled = true;
    submit.textContent = 'Submitting…';
    message.textContent = '';
    try {
      const { data, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data?.session) {
        const user = await window.panamaxRequireAuth?.();
        if (!user) return;
      }

      const bid = Number(amount.value);
      if (!Number.isFinite(bid) || bid <= 0) throw new Error('Enter a valid bid amount.');

      const result = await supabaseClient.rpc('place_bid', {
        p_auction_id: selected.id,
        p_amount: bid
      });
      if (result.error) throw result.error;

      message.textContent = 'Bid placed successfully!';
      await loadAuctions();
      await loadHistory(selected.id);
    } catch (error) {
      console.error('[PanamaXChange bid]', error);
      message.textContent = error?.message || 'Could not place bid.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Place bid →';
    }
  }

  /** Initialize the auction page after the shared customer auth client exists. */
  function start() {
    if (!auth?.client) {
      showError(new Error('Authentication client is not ready. Refresh the page and try again.'));
      return;
    }
    submit?.addEventListener('click', placeBid);
    closeBid?.addEventListener('click', () => modal.classList.add('hidden'));
    modal?.addEventListener('click', event => {
      if (event.target === modal) modal.classList.add('hidden');
    });
    document.getElementById('refreshAuctions')?.addEventListener('click', loadAuctions);
    setInterval(() => {
      document.querySelectorAll('[data-end]').forEach(element => {
        element.textContent = countdown(element.dataset.end);
      });
    }, 1000);
    loadAuctions();
  }

  document.addEventListener('DOMContentLoaded', start);
})();
