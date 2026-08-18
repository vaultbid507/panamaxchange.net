(() => {
  const auth = window.PanamaXChangeAuth;
  if (!auth?.client) return;
  const db = auth.client;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money = v => Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const authView=$('authView'), accountView=$('accountView');
  function nameOf(user){return user?.user_metadata?.full_name||user?.user_metadata?.name||user?.email?.split('@')[0]||'Account'}
  function showAuth(){authView?.classList.remove('hidden');accountView?.classList.add('hidden')}
  function showUser(user){
    authView?.classList.add('hidden'); accountView?.classList.remove('hidden');
    const name=nameOf(user); ['accountName','sidebarName'].forEach(id=>{if($(id))$(id).textContent=name});
    ['sidebarEmail','accountEmail','profileEmail'].forEach(id=>{if($(id))$(id).textContent=user.email||''});
    if($('profileInitial'))$('profileInitial').textContent=name.trim().charAt(0).toUpperCase();
    loadOrders(user.id); loadBids(user.id);
  }
  async function loadOrders(uid){
    const box=$('ordersList'); if(!box)return;
    const {data,error}=await db.from('orders').select('id,total,status,created_at').eq('customer_id',uid).order('created_at',{ascending:false}).limit(25);
    if(error){box.innerHTML='<div class="account-list-item">Orders are unavailable right now.</div>';if($('orderCount'))$('orderCount').textContent='—';return}
    if($('orderCount'))$('orderCount').textContent=String(data?.length||0);
    box.innerHTML=data?.length?data.map(o=>`<div class="account-list-item"><strong>Order #${esc(o.id)}</strong><span class="status">${esc(o.status||'pending')}</span><small>${new Date(o.created_at).toLocaleString()} · ${money(o.total)}</small></div>`).join(''):'<div class="account-list-item">No orders yet. <a href="index.html#products">Start shopping →</a></div>';
  }
  async function loadBids(uid){
    const box=$('bidsList'); if(!box)return;
    const {data,error}=await db.from('bids').select('id,amount,created_at,auction_id').eq('bidder_id',uid).order('created_at',{ascending:false}).limit(25);
    if(error){box.innerHTML='<div class="account-list-item">Bidding activity is unavailable right now.</div>';if($('bidCount'))$('bidCount').textContent='—';return}
    if($('bidCount'))$('bidCount').textContent=String(data?.length||0);
    box.innerHTML=data?.length?data.map(b=>`<div class="account-list-item"><strong>${money(b.amount)}</strong><small>Auction #${esc(b.auction_id)} · ${new Date(b.created_at).toLocaleString()}</small></div>`).join(''):'<div class="account-list-item">No bids yet. <a href="bidding-unified.html">Explore auctions →</a></div>';
  }
  async function signOut(){await db.auth.signOut({scope:'local'});showAuth()}
  $('signOut')?.addEventListener('click',signOut); $('profileSignOut')?.addEventListener('click',signOut);
  db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')showAuth();else if(session?.user)showUser(session.user)});
  window.addEventListener('panamax-auth-ready',e=>{if(e.detail?.user)showUser(e.detail.user);else showAuth()});
  db.auth.getUser().then(({data})=>data?.user?showUser(data.user):showAuth());
})();
