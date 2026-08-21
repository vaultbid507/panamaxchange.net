(()=>{
  /**
   * PanamaXChange — canonical Admin authentication.
   *
   * Process:
   * 1. Create exactly one Supabase client for the Admin area.
   * 2. Use the current publishable key used by the working Admin client.
   * 3. Persist the session under the shared Admin storage key.
   * 4. Support normal Admin login/logout and optional returnTo navigation.
   * 5. Record successful login/logout events in the audit log.
   * 6. Expose the initialized client to management pages such as Auctions.
   */
  const SUPABASE_URL='https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY='sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0';
  const STORAGE='panamaxchange-auth';
  const $=id=>document.getElementById(id);
  let busy=false,client=null,liveLoaded=false;

  /** Display an authentication message to the operator. */
  const message=t=>{$('loginMessage')&&($('loginMessage').textContent=t||'')};
  /** Show the canonical Admin login view. */
  const loginView=()=>{$('loginSection')?.classList.remove('hidden');$('dashboard')?.classList.add('hidden')};
  /** Read a safe local return target supplied by a management page. */
  const getReturnTarget=()=>{const raw=new URLSearchParams(location.search).get('returnTo');if(!raw||raw.includes('://')||raw.startsWith('//'))return '';return raw.startsWith('/')?raw.slice(1):raw};
  /** Continue to the page that requested Admin authentication. */
  const continueToReturnTarget=()=>{const target=getReturnTarget();if(target&&!location.pathname.endsWith(target)){location.replace(target);return true}return false};
  /** Load live dashboard metrics only when the dashboard is actually shown. */
  const loadLive=()=>{if(liveLoaded||!document.getElementById('dashboard'))return;liveLoaded=true;const s=document.createElement('script');s.src='admin-dashboard-live.js?v=20260820-12';s.async=true;s.onload=()=>window.dispatchEvent(new Event('panamax-dashboard-ready'));s.onerror=()=>{liveLoaded=false;console.error('Unable to load live dashboard metrics')};document.head.appendChild(s)};
  /** Add a timeout around a Supabase promise so authentication cannot hang indefinitely. */
  const timeout=(p,ms)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('Supabase connection timed out.')),ms);p.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)})});
  /** Record a successful Admin security event without blocking authentication. */
  async function audit(eventType,summary,metadata={}){try{if(!client)return;await client.rpc('record_audit_event',{p_event_type:eventType,p_summary:summary,p_source:'admin-auth',p_metadata:metadata})}catch(e){console.warn('[PanamaXChange audit]',e?.message||e)}}
  /** Show the authenticated Admin dashboard and continue to a requested page when present. */
  const dashboardView=async u=>{$('loginSection')?.classList.add('hidden');$('dashboard')?.classList.remove('hidden');if($('adminEmailDisplay'))$('adminEmailDisplay').textContent=u?.email||'';if(!continueToReturnTarget())loadLive()};
  /** Initialize the single canonical Admin Supabase client and restore its session. */
  async function init(){client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORAGE}});const r=await timeout(client.auth.getSession(),10000);if(r.error)throw r.error;r.data?.session?dashboardView(r.data.session.user):loginView()}
  /** Authenticate the administrator with Supabase password authentication. */
  async function signIn(e){e.preventDefault();if(busy)return;busy=true;const b=$('loginButton');if(b){b.disabled=true;b.textContent='Signing in…'}message('');try{if(!client)await init();const email=$('email')?.value.trim()||'',password=$('password')?.value||'';if(!email||!password)throw new Error('Enter your email and password.');const r=await timeout(client.auth.signInWithPassword({email,password}),15000);if(r.error)throw r.error;if(!r.data?.session)throw new Error('Login succeeded but no session was returned.');await audit('login','Administrator signed in',{email});dashboardView(r.data.user)}catch(e){loginView();message(/invalid api key|api key/i.test(String(e?.message||''))?'Authentication service configuration error. Reload the Admin page once and try again.':(e.message||'Unable to sign in.'))}finally{busy=false;if(b){b.disabled=false;b.textContent='Sign in securely'}}}
  /** Sign out locally after recording a logout event. */
  async function signOut(){await audit('logout','Administrator signed out');try{if(client)await timeout(client.auth.signOut({scope:'local'}),5000)}catch(e){}try{localStorage.removeItem('sb-tagbxmpizwlvgddgcpcl-auth-token')}catch(e){}try{localStorage.removeItem(STORAGE)}catch(e){}location.replace('admin.html?loggedout='+Date.now())}
  document.addEventListener('DOMContentLoaded',()=>{$('loginForm')?.addEventListener('submit',signIn);$('logoutButton')?.addEventListener('click',signOut);init().catch(e=>{loginView();message(e.message||'Unable to connect to Supabase.')})});
  window.PanamaAdminAuth={get client(){return client},get storageKey(){return STORAGE},signOut};
})();
