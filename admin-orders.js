(() => {
  const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[ch]));
  const money = value => Number(value || 0).toLocaleString('en-US', {style:'currency', currency:'USD'});
  const state = { orders: [], editing: null };

  async function isAdmin(userId) {
    if (!userId) return false;
    const { data, error } = await client.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
    return !error && !!data?.user_id;
  }

  async function loadOrders() {
    const container = $('ordersContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading orders...</div>';
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session || !(await isAdmin(sessionData.session.user.id))) {
      container.innerHTML = '<div class="error-message">Administrator session required to view orders.</div>';
      return;
    }
    const { data, error } = await client.from('orders').select('id,customer_name,customer_email,total,status,created_at').order('created_at', { ascending: false });
    if (error) {
      container.innerHTML = `<div class="error-message">Unable to load orders: ${esc(error.message)}</div>`;
      return;
    }
    state.orders = data || [];
    render();
    updateSummary();
  }

  function filteredOrders() {
    const query = ($('orderSearch')?.value || '').trim().toLowerCase();
    const filter = $('orderStatusFilter')?.value || '';
    return state.orders.filter(order => {
      const text = `${order.id} ${order.customer_name || ''} ${order.customer_email || ''}`.toLowerCase();
      return (!query || text.includes(query)) && (!filter || String(order.status || 'pending').toLowerCase() === filter);
    });
  }

  function render() {
    const container = $('ordersContainer');
    if (!container) return;
    const orders = filteredOrders();
    const rows = orders.map(order => {
      if (state.editing === String(order.id)) return editRow(order);
      const status = String(order.status || 'pending').toLowerCase();
      return `<tr data-order-row="${esc(order.id)}">
        <td><strong>#${esc(order.id)}</strong><div class="muted">${order.created_at ? esc(new Date(order.created_at).toLocaleDateString()) : '—'}</div></td>
        <td><strong>${esc(order.customer_name || 'Customer')}</strong><div class="muted">${esc(order.customer_email || '')}</div></td>
        <td><strong>${money(order.total)}</strong></td>
        <td><span class="status-pill status-${esc(status)}">${esc(status.charAt(0).toUpperCase()+status.slice(1))}</span></td>
        <td><div class="row-actions"><button type="button" class="admin-button" data-order-edit="${esc(order.id)}">Edit</button><button type="button" class="admin-button primary" data-order-save-status="${esc(order.id)}">Update status</button></div></td>
      </tr>`;
    }).join('');
    container.innerHTML = `<div class="admin-table-wrap"><table class="admin-table orders-professional"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty-state">No orders found.</td></tr>'}</tbody></table></div>`;
    bind();
  }

  function editRow(order) {
    const status = String(order.status || 'pending').toLowerCase();
    return `<tr class="is-editing" data-order-row="${esc(order.id)}">
      <td><strong>#${esc(order.id)}</strong><div class="muted">${order.created_at ? esc(new Date(order.created_at).toLocaleString()) : '—'}</div></td>
      <td><input class="inline-edit" data-field="customer_name" value="${esc(order.customer_name || '')}" aria-label="Customer name"><input class="inline-edit" data-field="customer_email" type="email" value="${esc(order.customer_email || '')}" aria-label="Customer email"></td>
      <td><input class="inline-edit" data-field="total" type="number" min="0" step="0.01" value="${esc(order.total ?? 0)}" aria-label="Order total"></td>
      <td><select class="inline-edit" data-field="status"><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></td>
      <td><div class="row-actions"><button type="button" class="admin-button primary" data-order-save="${esc(order.id)}">Save changes</button><button type="button" class="admin-button" data-order-cancel="${esc(order.id)}">Cancel</button></div></td>
    </tr><tr class="edit-helper"><td colspan="5">Editing order #${esc(order.id)} — changes are saved securely to Supabase.</td></tr>`;
  }

  async function saveOrder(id) {
    const row = document.querySelector(`[data-order-row="${CSS.escape(String(id))}"]`);
    if (!row) return;
    const customerName = row.querySelector('[data-field="customer_name"]')?.value.trim();
    const customerEmail = row.querySelector('[data-field="customer_email"]')?.value.trim();
    const total = Number(row.querySelector('[data-field="total"]')?.value);
    const status = row.querySelector('[data-field="status"]')?.value;
    if (!customerName || !customerEmail || !Number.isFinite(total) || total < 0) {
      alert('Please enter a valid customer, email and total.');
      return;
    }
    const button = row.querySelector('[data-order-save]');
    if (button) { button.disabled = true; button.textContent = 'Saving...'; }
    const { error } = await client.from('orders').update({customer_name: customerName, customer_email: customerEmail, total, status}).eq('id', id);
    if (error) { alert(`Unable to save order: ${error.message}`); if (button) { button.disabled=false; button.textContent='Save changes'; } return; }
    state.editing = null;
    await loadOrders();
  }

  async function updateStatus(id) {
    const order = state.orders.find(item => String(item.id) === String(id));
    if (!order) return;
    const next = prompt('Enter status: pending, processing, shipped, delivered, or cancelled', order.status || 'pending');
    if (next === null) return;
    const status = next.trim().toLowerCase();
    if (!['pending','processing','shipped','delivered','cancelled'].includes(status)) { alert('Invalid order status.'); return; }
    const { error } = await client.from('orders').update({status}).eq('id', id);
    if (error) { alert(`Unable to update status: ${error.message}`); return; }
    await loadOrders();
  }

  function updateSummary() {
    const count = {pending:0, processing:0, shipped:0, delivered:0, cancelled:0};
    state.orders.forEach(order => { const s = String(order.status || 'pending').toLowerCase(); if (s in count) count[s]++; });
    [['orderTotal',state.orders.length],['orderPending',count.pending],['orderProcessing',count.processing],['orderCompleted',count.delivered+count.shipped],['orderCount',state.orders.length],['orders',state.orders.length],['pending',count.pending]].forEach(([id,value]) => { if ($(id)) $(id).textContent = value; });
    if ($('revenue')) $('revenue').textContent = money(state.orders.reduce((sum, order) => sum + Number(order.total || 0), 0));
  }

  function bind() {
    document.querySelectorAll('[data-order-edit]').forEach(button => button.onclick = () => { state.editing = String(button.dataset.orderEdit); render(); const select = document.querySelector(`[data-order-row="${CSS.escape(state.editing)}"] [data-field="status"]`); if (select) select.value = String(state.orders.find(o=>String(o.id)===state.editing)?.status || 'pending').toLowerCase(); });
    document.querySelectorAll('[data-order-cancel]').forEach(button => button.onclick = () => { state.editing = null; render(); });
    document.querySelectorAll('[data-order-save]').forEach(button => button.onclick = () => saveOrder(button.dataset.orderSave));
    document.querySelectorAll('[data-order-save-status]').forEach(button => button.onclick = () => updateStatus(button.dataset.orderSaveStatus));
  }

  $('orderSearch')?.addEventListener('input', render);
  $('orderStatusFilter')?.addEventListener('change', render);
  $('refreshOrders')?.addEventListener('click', loadOrders);
  window.addEventListener('load', () => setTimeout(loadOrders, 700));
})();