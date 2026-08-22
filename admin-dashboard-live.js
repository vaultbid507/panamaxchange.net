(()=>{
  /**
   * Live Admin dashboard metrics.
   *
   * Reuses the canonical PanamaAdminAuth client created by admin-auth.js so
   * the dashboard never creates a competing Supabase client or storage key.
   * Refreshes metrics on an interval, when the tab becomes visible, and when
   * relevant marketplace tables change through Supabase Realtime.
   */
  const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
  const money=v=>Number(v||0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  let db=null,timer=null,channel=null;
  function metric(label,value,sub){const c=all('.card').find(x=>x.querySelector('small')?.textContent.trim().toLowerCase()===label.toLowerCase());if(!c)return;c.querySelector('strong').textContent=value;const s=c.querySelector('span');if(s)s.textContent=sub}
  function setHero(t){const p=q('.hero p');if(p)p.textContent=t}
  function monthKey(v){const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
  function monthLabel(k){const [y,m]=k.split('-').map(Number);return new Date(Number(y),Number(m)-1,1).toLocaleDateString('en-US',{month:'short'})}
  async function init(){
    const api=window.PanamaAdminAuth;
    if(!api?.ready)throw new Error('Admin authentication is still initializing.');
    db=api.client||await api.ready;
    if(!db)throw new Error('Admin authentication client unavailable.');
    const s=await db.auth.getSession();
    if(s.error)throw s.error;
    if(!s.data?.session)throw new Error('Admin session not found. Please sign in again.');
  }
  async function load(){
    try{
      if(!db)await init();
      const [ordersR,productsR]=await Promise.all([
        db.rpc('admin_list_orders'),
        db.from('products').select('id,stock,category')
      ]);
      if(ordersR.error)throw new Error('Orders: '+ordersR.error.message);
      if(productsR.error)throw new Error('Products: '+productsR.error.message);
      const orders=Array.isArray(ordersR.data)?ordersR.data:[],products=Array.isArray(productsR.data)?productsR.data:[];
      const stock=products.reduce((n,p)=>n+Number(p.stock||0),0);
      const sales=orders.reduce((n,o)=>n+Number(o.total||0),0);
      metric('Total Products',products.length,'Live catalog items');
      metric('Stock Available',stock.toLocaleString('en-US'),'Live units in inventory');
      metric('Total Sales',money(sales),'Live order revenue');
      metric('Orders',orders.length,'Live recorded orders');
      setHero('Live marketplace data connected · Updated '+new Date().toLocaleTimeString());
      renderSales(orders);renderStock(products)
    }catch(e){
      console.error('[PanamaXChange dashboard]',e);
      setHero('Live data unavailable: '+(e.message||e));
      metric('Total Products','—','Unable to load live products');
      metric('Stock Available','—','Unable to load live inventory');
      metric('Total Sales','—','Unable to calculate revenue');
      metric('Orders','—','Unable to load live orders')
    }
  }
  function renderSales(orders){
    const wrap=q('.graphs .panel:first-child .bars');if(!wrap)return;
    const now=new Date(),keys=[];for(let i=5;i>=0;i--)keys.push(monthKey(new Date(now.getFullYear(),now.getMonth()-i,1)));
    const sums=Object.fromEntries(keys.map(k=>[k,0]));
    orders.forEach(o=>{const k=monthKey(o.created_at);if(k in sums)sums[k]+=Number(o.total||0)});
    const max=Math.max(1,...Object.values(sums));
    wrap.innerHTML=keys.map(k=>`<div class="bar"><i style="height:${Math.max(5,Math.round(sums[k]/max*88))}%" title="${money(sums[k])}"></i><b>${monthLabel(k)}</b></div>`).join('')
  }
  function renderStock(products){
    const panel=q('.graphs .panel:nth-child(2) .stock');if(!panel)return;
    const totals={};products.forEach(p=>{const c=String(p.category||'Other').trim()||'Other';totals[c]=(totals[c]||0)+Number(p.stock||0)});
    const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,5),max=Math.max(1,...entries.map(x=>x[1]));
    panel.innerHTML=entries.length?entries.map(([name,v])=>`<div class="stock-row"><label>${String(name).replace(/[&<>]/g,'')}</label><div class="track"><span style="width:${Math.max(4,Math.round(v/max*100))}%"></span></div><b>${v.toLocaleString('en-US')}</b></div>`).join(''):'<div style="color:#64748b;font-size:12px">No inventory data.</div>'
  }
  function start(){
    load();
    clearInterval(timer);timer=setInterval(load,15000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
    try{
      if(db){
        channel=db.channel('admin-dashboard-live')
          .on('postgres_changes',{event:'*',schema:'public',table:'orders'},load)
          .on('postgres_changes',{event:'*',schema:'public',table:'products'},load)
          .subscribe();
      }
    }catch(e){console.warn('[PanamaXChange realtime]',e?.message||e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start(),{once:true});else start()
})();
