(() => {
  const sb = window.supabase?.createClient?.(
    "https://tagbxmpizwlvgddgcpcl.supabase.co",
    "sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0"
  );
  if (!sb) return;

  const money = n => Number(n || 0).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const days = 7;
  let injected = false;

  function inject() {
    if (injected || !document.getElementById('overview')) return;
    const overview = document.getElementById('overview');
    const section = document.createElement('section');
    section.id = 'liveOperations';
    section.innerHTML = `
      <div class="admin-section-title"><div><p class="eyebrow">LIVE OPERATIONS</p><h2>Business pulse</h2><p>Real-time operational metrics and attention items.</p></div><button id="refreshLive" class="admin-button">↻ Refresh</button></div>
      <div class="live-metrics">
        <div class="admin-card live-metric"><small>Today's sales</small><strong id="liveSales">—</strong><span id="liveSalesCount">Loading…</span></div>
        <div class="admin-card live-metric"><small>New orders today</small><strong id="liveOrders">—</strong><span>Orders placed today</span></div>
        <div class="admin-card live-metric"><small>New customers</small><strong id="liveCustomers">—</strong><span>Accounts in last 7 days</span></div>
        <div class="admin-card live-metric"><small>Active auctions</small><strong id="liveAuctions">—</strong><span>Currently accepting bids</span></div>
      </div>
      <div class="live-columns">
        <div class="admin-card"><div class="live-card-head"><div><h3>Revenue · 7 days</h3><small>Recorded order value</small></div><strong id="livePeriodRevenue">$0.00</strong></div><canvas id="revenueChart" height="150" aria-label="Seven day revenue chart"></canvas></div>
        <div class="admin-card"><div class="live-card-head"><div><h3>Attention needed</h3><small>Items requiring action</small></div></div><div id="attentionList" class="attention-list"><div class="live-empty">Loading…</div></div></div>
      </div>`;
    overview.appendChild(section);
    injected = true;
    document.getElementById('refreshLive')?.addEventListener('click', refresh);
    refresh();
  }

  async function query(table, columns='*') {
    const {data,error}=await sb.from(table).select(columns);
    if(error) throw error;
    return data || [];
  }

  function dayKey(date){ const d=new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function lastDays(){ const out=[]; const now=new Date(); for(let i=days-1;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(now.getDate()-i);out.push({key:dayKey(d),label:d.toLocaleDateString('en-US',{weekday:'short'})});} return out; }

  async function refresh(){
    const button=document.getElementById('refreshLive'); if(button){button.disabled=true;button.textContent='Refreshing…';}
    try{
      const [products,orders,auctions]=await Promise.allSettled([
        query('products','id,name,stock,price'),
        query('orders','id,total,status,created_at'),
        query('auctions','id,status,start_time,end_time,current_bid')
      ]);
      const ps=products.status==='fulfilled'?products.value:[];
      const os=orders.status==='fulfilled'?orders.value:[];
      const as=auctions.status==='fulfilled'?auctions.value:[];
      const now=new Date(); const start=new Date(now); start.setHours(0,0,0,0);
      const week=new Date(start); week.setDate(week.getDate()-6);
      const today=os.filter(o=>new Date(o.created_at)>=start && String(o.status).toLowerCase()!=='cancelled');
      const sales=today.reduce((s,o)=>s+Number(o.total||0),0);
      document.getElementById('liveSales').textContent=money(sales);
      document.getElementById('liveSalesCount').textContent=`${today.length} completed/pending orders`;
      document.getElementById('liveOrders').textContent=today.length;
      const active=as.filter(a=>String(a.status||'').toLowerCase()==='active' || (new Date(a.start_time)<=now && new Date(a.end_time)>now && !['cancelled','ended'].includes(String(a.status||'').toLowerCase())));
      document.getElementById('liveAuctions').textContent=active.length;
      const period=os.filter(o=>new Date(o.created_at)>=week && String(o.status).toLowerCase()!=='cancelled');
      document.getElementById('livePeriodRevenue').textContent=money(period.reduce((s,o)=>s+Number(o.total||0),0));
      drawChart(period);
      let users=0;
      try { const r=await sb.rpc('admin_list_users'); if(!r.error) users=(r.data||[]).filter(u=>new Date(u.created_at)>=week).length; } catch(e){}
      document.getElementById('liveCustomers').textContent=users;
      const low=ps.filter(p=>Number(p.stock||0)>0 && Number(p.stock)<=5).sort((a,b)=>Number(a.stock)-Number(b.stock));
      const out=ps.filter(p=>Number(p.stock||0)<=0);
      const pending=os.filter(o=>['pending','processing'].includes(String(o.status||'').toLowerCase()));
      const attention=[];
      if(out.length) attention.push(`<div class="attention danger"><b>${out.length}</b> item${out.length===1?'':'s'} out of stock <span>Review inventory</span></div>`);
      if(low.length) attention.push(`<div class="attention warning"><b>${low.length}</b> low-stock item${low.length===1?'':'s'} <span>Restock soon</span></div>`);
      if(pending.length) attention.push(`<div class="attention info"><b>${pending.length}</b> order${pending.length===1?'':'s'} need fulfillment <span>Process orders</span></div>`);
      if(!attention.length) attention.push('<div class="live-empty">✓ Nothing needs attention right now.</div>');
      document.getElementById('attentionList').innerHTML=attention.join('');
    }catch(e){ console.error('LIVE DASHBOARD',e); document.getElementById('attentionList').innerHTML='<div class="live-empty">Live metrics are temporarily unavailable.</div>'; }
    finally{ if(button){button.disabled=false;button.textContent='↻ Refresh';} }
  }

  function drawChart(orders){
    const canvas=document.getElementById('revenueChart'); if(!canvas) return;
    const ctx=canvas.getContext('2d'), rect=canvas.getBoundingClientRect(), ratio=window.devicePixelRatio||1;
    const w=Math.max(rect.width,320), h=150; canvas.width=w*ratio;canvas.height=h*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);
    const labels=lastDays(), vals=labels.map(d=>orders.filter(o=>dayKey(o.created_at)===d.key).reduce((s,o)=>s+Number(o.total||0),0));
    ctx.clearRect(0,0,w,h); const max=Math.max(...vals,1), pad={l:8,r:8,t:18,b:28};
    ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;ctx.font='11px system-ui';ctx.fillStyle='#91a5b8';
    for(let i=0;i<3;i++){const y=pad.t+(h-pad.t-pad.b)*i/2;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();}
    const points=vals.map((v,i)=>[pad.l+(w-pad.l-pad.r)*(i/(vals.length-1)),pad.t+(h-pad.t-pad.b)*(1-v/max)]);
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle='#21d4a4';ctx.lineWidth=2.5;ctx.stroke();
    points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p[0],p[1],3.5,0,Math.PI*2);ctx.fillStyle='#21d4a4';ctx.fill();ctx.fillStyle='#91a5b8';ctx.textAlign='center';ctx.fillText(labels[i].label,p[0],h-8);});
  }

  const observer=new MutationObserver(inject); observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',inject); else inject();
  window.addEventListener('resize',()=>{ if(injected) refresh(); });
  setInterval(()=>{ if(!document.hidden && injected) refresh(); },60000);
})();