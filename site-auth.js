(() => {
  const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHKbF0';
  const STORAGE_KEY = 'panamaxchange-user-auth';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORAGE_KEY }
  });
  window.PanamaUserAuth = { client, storageKey: STORAGE_KEY };

  const style = document.createElement('style');
  style.textContent = `
    .user-auth-wrap{display:flex;align-items:center;gap:10px;margin-left:auto}
    .user-auth-btn{border:1px solid #d7e0eb;background:#fff;color:#172033;padding:9px 13px;border-radius:10px;font:600 13px/1 inherit;cursor:pointer;text-decoration:none}
    .user-auth-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
    .user-profile{display:flex;align-items:center;gap:9px}
    .user-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#eaf1ff;border:1px solid #dbe5f0}
    .user-name{font-size:13px;font-weight:700;color:#172033}
    .auth-backdrop{position:fixed;inset:0;z-index:3000;background:rgba(7,17,31,.55);display:grid;place-items:center;padding:20px}
    .auth-backdrop.hidden{display:none}
    .auth-card{width:min(430px,100%);background:#fff;border-radius:18px;padding:25px;box-shadow:0 28px 80px rgba(7,17,31,.28)}
    .auth-card h2{margin:0 0 6px;font-size:22px}.auth-card p{color:#64748b;font-size:13px}
    .auth-field{display:grid;gap:6px;margin:13px 0}.auth-field label{font-size:12px;font-weight:700;color:#334155}.auth-field input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px}
    .auth-actions{display:flex;gap:9px;margin-top:16px}.auth-message{min-height:20px;font-size:12px;margin-top:11px;color:#b42318}.auth-close{float:right;border:0;background:transparent;font-size:18px;cursor:pointer}
  `;
  document.head.appendChild(style);

  function escapeHtml(v){return String(v ?? '').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));}
  function displayName(user){return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Account';}
  function avatar(user){return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName(user))}&background=2563eb&color=fff&size=80`;}

  function mount(){
    document.querySelectorAll('[data-user-auth]').forEach(el => {
      el.innerHTML = '<button class="user-auth-btn primary" data-auth-open>Login / Register</button>';
    });
    if(!document.getElementById('siteAuthModal')){
      const modal=document.createElement('div'); modal.id='siteAuthModal'; modal.className='auth-backdrop hidden';
      modal.innerHTML=`<div class="auth-card"><button class="auth-close" data-auth-close>✕</button><p class="eyebrow">PANAMAXCHANGE ACCOUNT</p><h2 id="authTitle">Login</h2><p id="authSubtitle">Sign in to manage your account, orders and auctions.</p><form id="siteAuthForm"><div class="auth-field"><label for="authName">Name</label><input id="authName" autocomplete="name" placeholder="Your name"></div><div class="auth-field"><label for="authEmail">Email</label><input id="authEmail" type="email" autocomplete="email" required></div><div class="auth-field"><label for="authPassword">Password</label><input id="authPassword" type="password" minlength="6" autocomplete="current-password" required></div><div class="auth-actions"><button type="submit" class="user-auth-btn primary" id="authSubmit">Login</button><button type="button" class="user-auth-btn" id="authSwitch">Create account</button></div><div id="authMessage" class="auth-message"></div></form></div>`;
      document.body.appendChild(modal);
    }
    document.querySelectorAll('[data-auth-open]').forEach(b=>b.onclick=()=>openModal(false));
    document.querySelector('[data-auth-close]')?.addEventListener('click',closeModal);
    document.getElementById('siteAuthModal')?.addEventListener('click',e=>{if(e.target.id==='siteAuthModal')closeModal()});
    document.getElementById('authSwitch')?.addEventListener('click',()=>setMode(true));
    document.getElementById('siteAuthForm')?.addEventListener('submit',submitAuth);
    sync();
  }
  let registerMode=false;
  function setMode(register){registerMode=register;const title=document.getElementById('authTitle'),sub=document.getElementById('authSubtitle'),name=document.getElementById('authName'),submit=document.getElementById('authSubmit'),switcher=document.getElementById('authSwitch');if(title)title.textContent=register?'Create account':'Login';if(sub)sub.textContent=register?'Register once and use the same account on Shop, My Account and Live Bidding.':'Sign in to manage your account, orders and auctions.';if(name)name.parentElement.style.display=register?'grid':'none';if(submit)submit.textContent=register?'Register':'Login';if(switcher)switcher.textContent=register?'Back to login':'Create account';document.getElementById('authMessage').textContent='';}
  function openModal(register){document.getElementById('siteAuthModal')?.classList.remove('hidden');setMode(register);}
  function closeModal(){document.getElementById('siteAuthModal')?.classList.add('hidden');}
  async function submitAuth(e){e.preventDefault();const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value,name=document.getElementById('authName').value.trim(),msg=document.getElementById('authMessage'),btn=document.getElementById('authSubmit');btn.disabled=true;msg.textContent='';try{if(registerMode){const r=await client.auth.signUp({email,password,options:{data:{full_name:name}}});if(r.error)throw r.error;if(r.data.session){closeModal()}else msg.textContent='Account created. Check your email to confirm your account, then log in.';}else{const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;closeModal();}sync()}catch(err){msg.textContent=err.message||'Authentication failed.'}finally{btn.disabled=false}}
  function sync(){client.auth.getSession().then(({data})=>{const user=data?.session?.user;document.querySelectorAll('[data-user-auth]').forEach(el=>{if(!user){el.innerHTML='<button class="user-auth-btn primary" data-auth-open>Login / Register</button>';el.querySelector('[data-auth-open]')?.addEventListener('click',()=>openModal(false));return;}el.innerHTML=`<div class="user-profile"><img class="user-avatar" src="${escapeHtml(avatar(user))}" alt="${escapeHtml(displayName(user))}"><span class="user-name">${escapeHtml(displayName(user))}</span><a class="user-auth-btn" href="account.html">My Account</a><button class="user-auth-btn" data-user-logout>Sign out</button></div>`;el.querySelector('[data-user-logout]')?.addEventListener('click',async()=>{await client.auth.signOut({scope:'local'});sync()})})})}
  client.auth.onAuthStateChange(()=>sync());
  document.addEventListener('DOMContentLoaded',mount);
})();
