(function(){
  async function loadOrdersDirect(){
    const c=document.getElementById('ordersContainer');
    if(!c || typeof supabaseClient==='undefined') return;
    c.innerHTML='<div class="loading">Loading orders...</div>';
    const {data,error}=await supabaseClient.from('orders').select('id,customer_name,customer_email,total,status,created_at').order('created_at',{ascending:false});
    if(error){
      c.innerHTML='<div class="error-message">Unable to load orders: '+String(error.message||'Unknown error').replace(/[&<>\"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[x]})+'</div>';
      return;
    }
    const orders=data||[];
    const esc=v=>String(v??'').replace(/[&<>\"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[x]));
    const money=v=>Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
    const st=v=>String(v||'pending').toLowerCase();
    const rows=orders.map(o=>`<tr data-order-row="${esc(o.id)}"><td><strong>#${esc(o.id)}</strong></td><td>${esc(o.customer_name||'Customer')}<br><small>${esc(o.customer_email||'')}</small></td><td>${money(o.total)}</td><td>${o.created_at?new Date(o.created_at).toLocaleString():'—'}</td><td><select class="order-status" data-order-id="${esc(o.id)}"><option value="pending" ${st(o.status)==='pending'?'selected':''}>Pending</option><option value="processing" ${st(o.status)==='processing'?'selected':''}>Processing</option><option value="shipped" ${st(o.status)==='shipped'?'selected':''}>Shipped</option><option value="delivered" ${st(o.status)==='delivered'?'selected':''}>Delivered</option><option value="cancelled" ${st(o.status)==='cancelled'?'selected':''}>Cancelled</option></select> <button type="button" class="admin-button" data-edit-order="${esc(o.id)}">Edit</button> <button type="button" class="admin-button danger" data-delete-order="${esc(o.id)}">Remove</button></td></tr>`).join('');
    c.innerHTML='<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">No orders found.</td></tr>')+'</tbody></table></div>';
    const counts={pending:0,processing:0,shipped:0,delivered:0,cancelled:0}; orders.forEach(o=>{const s=st(o.status);if(counts[s]!==undefined)counts[s]++});
    [['orderTotal',orders.length],['orderPending',counts.pending],['orderProcessing',counts.processing],['orderCompleted',counts.delivered+counts.shipped],['orderCount',orders.length],['orders',orders.length],['pending',counts.pending]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v});
  }
  window.addEventListener('load',function(){setTimeout(loadOrdersDirect,300);});
  document.getElementById('refreshOrders')?.addEventListener('click',loadOrdersDirect);
})();