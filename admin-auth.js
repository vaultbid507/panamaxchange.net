(()=>{
  /** PanamaXChange — canonical Admin authentication. Customer sessions are never treated as staff sessions. */
  const SUPABASE_URL='https://tagbxmpizwlvgddgcpcl.supabase.co';
  const SUPABASE_KEY='sb_publishable_X36Iq53rm8U8HBkBfL06Vw_zErQRHK0';
  const STORAGE='panamaxchange-admin-auth';
  const $=id=>document.getElementById(id); let busy=false,client=null,liveLoaded=false;
  const message=t=>{$('loginMessage')&&($('loginMessage').textContent=t||'')};
  const loginView=()=>{$('loginSection')?.classList.remove('hidden');$('dashboard')?.classList.add('hidden')};
  const getReturnTarget=()=>{const raw=new URLSearchParams(location.search).get('returnTo');if(!raw||raw.includes('://')||raw.startsWith('//')) return '';return raw.startsWith('/')?raw.slice(1):raw};
  const continueToReturnTarget=()=>{const target=getReturnTarget();if(!target)return false;const clean=target.split('?')[0].split('#')[0];if(clean===location.pathname.split('/').pop())return false;location.replace(target);return true};
  const timeout=(p,ms)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('Supabase connection timed out.')),ms);p.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)})});
  async function audit(eventType,summary,metadata={}){try{if(client)await client.rpc('record_audit_event',{p_event_type:eventType,p_summary:summary,p_source:'admin-auth',p_metadata:metadata})}catch(e){console.warn('[audit]',e?.message||e)}}
  const loadLive=()=>{if(liveLoaded||!document.getElementById('dashboard'))return;liveLoaded=true;const s=document.createElement('script');s.src='admin-dashboard-live.js?v=20260821-10';s.async=true;s.onerror=()=>{liveLoaded=false};document.head.appendChild(s)};
  async function isStaffSession(){
    const user=(await timeout(client.auth.getUser(),8000)).data?.user;
    if(!user)return false;
    try{const r=await timeout(client.rpc('current_user_role'),8000);const role=String(r.data||'').toLowerCase();if(!r.error&&(role==='admin'||role==='moderator'))return true}catch(e){}
    try{const r=await timeout(client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle(),8000);if(!r.error&&r.data?.user_id)return true}catch(e){}
    return false;
  }
  const dashboardView=async u=>{$('loginSection')?.classList.add('hidden');$('dashboard')?.classList.remove('hidden');if($('adminEmailDisplay'))$('adminEmailDisplay').textContent=u?.email||'';if(!continueToReturnTarget())loadLive()};
  const ready=(async()=>{
    if(!window.supabase?.createClient)throw new Error('Supabase library is unavailable.');
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:STORAGE}});
    const r=await timeout(client.auth.getSession(),10000);if(r.error)throw r.error;
    if(r.data?.session){
      if(await isStaffSession())await dashboardView(r.data.session.user);
      else{await client.auth.signOut({scope:'local'});loginView();message('Please sign in with an administrator or moderator account.')}
    }else loginView();
    return client;
  })();
  async function signIn(e){e.preventDefault();if(busy)return;busy=true;const b=$('loginButton');if(b){b.disabled=true;b.textContent='Signing in…'}message('');try{await ready;const email=$('email')?.value.trim()||'',password=$('password')?.value||'';if(!email||!password)throw new Error('Enter your email and password.');const r=await timeout(client.auth.signInWithPassword({email,password}),15000);if(r.error)throw r.error;if(!(await isStaffSession())){await client.auth.signOut({scope:'local'});throw new Error('This account is not authorized for Admin access.')}await audit('login','Administrator signed in',{email});await dashboardView(r.data.user)}catch(e){loginView();message(/invalid api key|api key/i.test(String(e?.message||''))?'Authentication service configuration error.':(e.message||'Unable to sign in.'))}finally{busy=false;if(b){b.disabled=false;b.textContent='Sign in securely'}}}
  async function signOut(){await audit('logout','Administrator signed out');try{await timeout(client.auth.signOut({scope:'local'}),5000)}catch(e){}try{localStorage.removeItem(STORAGE)}catch(e){}location.replace('admin.html?loggedout='+Date.now())}
  window.PanamaAdminAuth={get client(){return client},get storageKey(){return STORAGE},get ready(){return ready},signOut};
  document.addEventListener('DOMContentLoaded',()=>{$('loginForm')?.addEventListener('submit',signIn);$('logoutButton')?.addEventListener('click',signOut);ready.catch(e=>{loginView();message(e.message||'Unable to connect to Supabase.')})});
})();
