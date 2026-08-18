(() => {
  const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHKbF0';
  const STORAGE_KEY = 'panamaxchange-user-session';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORAGE_KEY }
  });
  window.PanamaXChangeAuth = { client, storageKey: STORAGE_KEY };

  function nameOf(user){ return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Account'; }
  function avatarOf(user){ return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameOf(user))}&background=2563eb&color=fff&size=80`; }
  const qs = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));

  function ensureStyles(){
    if(qs('#panamax-unified-auth-style')) return;
    const style=document.createElement('style'); style.id='panamax-unified-auth-style';
    style.textContent=`.px-auth{display:flex;align-items:center;gap:9px;margin-left:auto}.px-auth a,.px-auth button{border:1px solid #d7e0eb;background:#fff;color:#172033;padding:9px 12px;border-radius:10px;font:600 13px/1 inherit;text-decoration:none;cursor:pointer}.px-auth .primary{background:#2563eb;color:#fff;border-color:#2563eb}.px-user{display:flex;align-items:center;gap:8px}.px-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#eaf1ff;border:1px solid #dbe5f0}.px-name{font-size:13px;font-weight:700;color:#172033}.px-auth-modal{position:fixed;inset:0;z-index:5000;background:rgba(7,17,31,.55);display:grid;place-items:center;padding:20px}.px-auth-modal.hidden{display:none}.px-auth-card{width:min(430px,100%);background:#fff;border-radius:18px;padding:25px;box-shadow:0 28px 80px rgba(7,17,31,.28)}.px-auth-card input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px}.px-auth-field{display:grid;gap:6px;margin:12px 0}.px-auth-field label{font-size:12px;font-weight:700}.px-auth-actions{display:flex;gap:9px;margin-top:16px}.px-auth-message{min-height:20px;font-size:12px;color:#b42318;margin-top:10px}`;
    document.head.appendChild(style);
  }

  let mode='login';
  function modal(){
    if(qs('#pxAuthModal')) return qs('#pxAuthModal');
    ensureStyles();
    const m=document.createElement('div'); m.id='pxAuthModal'; m.className='px-auth-modal hidden';
    m.innerHTML=`<div class="px-auth-card"><button type="button" id="pxAuthClose" style="float:right;border:0;background:transparent;font-size:18px;cursor:pointer">✕</button><p class="eyebrow">PANAMAXCHANGE ACCOUNT</p><h2 id="pxAuthTitle">Login</h2><p id="pxAuthSubtitle">Use one account across the entire storefront.</p><form id="pxAuthForm"><div class="px-auth-field"><label for="pxName">Name</label><input id="pxName" autocomplete="name"></div><div class="px-auth-field"><label for="pxEmail">Email</label><input id="pxEmail" type="email" autocomplete="username" required></div><div class="px-auth-field"><label for="pxPassword">Password</label><input id="pxPassword" type="password" minlength="6" autocomplete="current-password" required></div><div class="px-auth-actions"><button type="submit" class="primary" id="pxAuthSubmit">Login</button><button type="button" id="pxAuthToggle">Create account</button></div><div id="pxAuthMessage" class="px-auth-message"></div></form></div>`;
    document.body.appendChild(m);
    qs('#pxAuthClose').onclick=()=>m.classList.add('hidden');
    m.onclick=e=>{if(e.target===m)m.classList.add('hidden')};
    qs('#pxAuthToggle').onclick=()=>setMode(mode==='login'?'register':'login');
    qs('#pxAuthForm').onsubmit=submit;
    return m;
  }
  function setMode(next){
    mode=next; const register=mode==='register'; modal().classList.remove('hidden');
    qs('#pxAuthTitle').textContent=register?'Create account':'Login';
    qs('#pxAuthSubtitle').textContent=register?'Register once and use the same account on Shop, Bidding, Checkout and My Account.':'Use one account across the entire storefront.';
    qs('#pxName').parentElement.style.display=register?'grid':'none';
    qs('#pxAuthSubmit').textContent=register?'Register':'Login';
    qs('#pxAuthToggle').textContent=register?'Back to login':'Create account';
    qs('#pxAuthMessage').textContent='';
  }
  function open(){ setMode('login'); }
  async function submit(e){
    e.preventDefault(); const msg=qs('#pxAuthMessage'),btn=qs('#pxAuthSubmit'); msg.textContent='';btn.disabled=true;
    try{
      const email=qs('#pxEmail').value.trim().toLowerCase(), password=qs('#pxPassword').value, name=qs('#pxName').value.trim();
      if(mode==='register'){
        const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:name}}});
        if(error) throw error;
        if(!data.session){ msg.textContent='Account created. Check your email to confirm, then log in.'; setMode('login'); qs('#pxEmail').value=email; qs('#pxPassword').value=''; return; }
      } else {
        const {error}=await client.auth.signInWithPassword({email,password}); if(error) throw error;
      }
      qs('#pxAuthModal')?.classList.add('hidden'); refreshAll();
    }catch(err){ msg.textContent=err?.message || 'Authentication failed.'; }
    finally{btn.disabled=false}
  }
  function refreshAll(){
    client.auth.getUser().then(({data})=>{
      const user=data?.user;
      document.querySelectorAll('[data-user-auth]').forEach(el=>{
        if(!user){el.innerHTML='<button type="button" class="px-auth-btn primary" data-px-login>Login / Register</button>';el.className='px-auth';el.querySelector('[data-px-login]').onclick=open;return;}
        el.className='px-auth'; el.innerHTML=`<div class="px-user"><img class="px-avatar" src="${esc(avatarOf(user))}" alt="${esc(nameOf(user))}"><span class="px-name">${esc(nameOf(user))}</span></div><a href="account.html">My Account</a><button type="button" data-px-logout>Sign out</button>`;
        el.querySelector('[data-px-logout]').onclick=async()=>{await client.auth.signOut({scope:'local'});refreshAll()};
      });
      document.querySelectorAll('[data-require-auth]').forEach(el=>{el.disabled=!user;el.dataset.authenticated=String(!!user)});
      window.dispatchEvent(new CustomEvent('panamax-auth-ready',{detail:{user}}));
    });
  }
  client.auth.onAuthStateChange(()=>refreshAll());
  window.panamaxRequireAuth = async () => { const {data}=await client.auth.getUser(); if(data?.user) return data.user; open(); return null; };
  document.addEventListener('DOMContentLoaded',()=>{modal();refreshAll()});
})();
