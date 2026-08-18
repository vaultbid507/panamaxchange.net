/**
 * PanamaXChange Admin — User Management
 *
 * Loads every registered Supabase Auth user through the protected
 * `admin_list_users()` RPC and renders the result in the Admin Users table.
 * The page also provides role filtering, search, role changes, deletion,
 * summary counters, session validation, and sign-out handling.
 *
 * IMPORTANT SECURITY MODEL:
 * - The browser uses only the Supabase publishable/anon key.
 * - Administrator authorization is enforced by Supabase RLS/RPC policies.
 * - `admin_list_users()` reads `auth.users` server-side with SECURITY DEFINER.
 * - The frontend never attempts to read `auth.users` directly.
 */
const SUPABASE_URL = 'https://tagbxmpizwlvgddgcpcl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cnJlbnQifQ.invalid-placeholder';
// The exact verified publishable/anon key is injected by the deployment build.
const STORAGE_KEY = 'panamaxchange-auth';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORAGE_KEY }
});

/** Return an element by ID. @param {string} id @returns {HTMLElement|null} */
const $ = id => document.getElementById(id);

/** Escape untrusted values before inserting them into HTML. @param {*} value @returns {string} */
const esc = value => String(value ?? '').replace(/[&<>\"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;'
}[character]));

let users = [];
let editing = null;

/**
 * Add a hard timeout to Supabase requests so the page cannot remain on
 * "Loading users..." forever.
 * @param {Promise<any>} promise - Supabase promise.
 * @param {number} [ms=12000] - Timeout in milliseconds.
 * @returns {Promise<any>}
 */
const wait = (promise, ms = 12000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Check Supabase connection and RLS permissions.')), ms))
]);

/**
 * Verify that an authenticated session exists before loading admin data.
 * The server-side RPC remains the authoritative administrator check.
 * @returns {Promise<boolean>}
 */
async function auth() {
  const sessionResult = await wait(db.auth.getSession());
  if (!sessionResult.data?.session) {
    $('rows').innerHTML = '<tr><td colspan="6" class="error">No administrator session. Sign in again.</td></tr>';
    return false;
  }
  return true;
}

/**
 * Load all registered users from the protected Admin RPC.
 * This is the critical path that connects newly registered storefront users
 * to the Admin Users page.
 * @returns {Promise<void>}
 */
async function load() {
  const rows = $('rows');
  rows.innerHTML = '<tr><td colspan="6" class="empty">Loading users...</td></tr>';

  try {
    if (!(await auth())) return;

    const result = await wait(db.rpc('admin_list_users'));
    if (result.error) throw result.error;

    users = (result.data || []).map(user => ({
      id: user.user_id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      is_admin: !!user.is_admin,
      role: user.role || (user.is_admin ? 'admin' : 'registered')
    }));

    editing = null;
    summary();
    render();
  } catch (error) {
    console.error('[PanamaXChange users] load failed:', error);
    rows.innerHTML = `<tr><td colspan="6" class="error">Unable to load users: ${esc(error.message || error)}</td></tr>`;
  }
}

/** Update the dashboard counters from the currently loaded user list. */
function summary() {
  const moderators = users.filter(user => user.role === 'moderator').length;
  $('total').textContent = users.length;
  $('admins').textContent = users.filter(user => user.is_admin || user.role === 'admin').length;
  $('active').textContent = users.filter(user => user.last_sign_in_at).length;
  if ($('moderators')) $('moderators').textContent = moderators;
}

/** Render users according to the active search and role filters. */
function render() {
  const query = ($('search')?.value || '').trim().toLowerCase();
  const role = $('role')?.value || '';

  const filtered = users.filter(user => {
    const text = `${user.name} ${user.email}`.toLowerCase();
    const matchesSearch = !query || text.includes(query);
    const userRole = user.is_admin ? 'admin' : user.role === 'moderator' ? 'moderator' : 'registered';
    return matchesSearch && (!role || userRole === role);
  });

  $('rows').innerHTML = filtered.length
    ? filtered.map(user => editing === String(user.id) ? editRow(user) : row(user)).join('')
    : '<tr><td colspan="6" class="empty">No users found.</td></tr>';

  bind();
}

/** Render one read-only user row. @param {Object} user @returns {string} */
function row(user) {
  const role = user.is_admin ? 'Administrator' : user.role === 'moderator' ? 'Moderator' : 'Registered user';
  const roleClass = user.is_admin ? 'role-admin' : user.role === 'moderator' ? 'role-moderator' : 'role-user';
  return `<tr>
    <td><strong>${esc(user.name)}</strong></td>
    <td>${esc(user.email)}</td>
    <td>${user.created_at ? esc(new Date(user.created_at).toLocaleDateString()) : '—'}</td>
    <td>${user.last_sign_in_at ? esc(new Date(user.last_sign_in_at).toLocaleString()) : 'Never'}</td>
    <td><span class="role-pill ${roleClass}">${role}</span></td>
    <td><div class="actions">
      <button class="btn" data-edit="${esc(user.id)}">Edit</button>
      <button class="btn danger" data-remove="${esc(user.id)}">Remove</button>
    </div></td>
  </tr>`;
}

/** Render an editable row for administrator/moderator role changes. */
function editRow(user) {
  const selected = user.is_admin ? 'admin' : (user.role === 'moderator' ? 'moderator' : 'registered');
  return `<tr class="editing">
    <td><strong>${esc(user.name)}</strong></td>
    <td>${esc(user.email)}</td>
    <td colspan="2"></td>
    <td>
      <select class="edit" data-role>
        <option value="registered" ${selected === 'registered' ? 'selected' : ''}>Registered user</option>
        <option value="moderator" ${selected === 'moderator' ? 'selected' : ''}>Moderator</option>
        <option value="admin" ${selected === 'admin' ? 'selected' : ''}>Administrator</option>
      </select>
    </td>
    <td><div class="actions">
      <button class="btn primary" data-save="${esc(user.id)}">Save</button>
      <button class="btn" data-cancel>Cancel</button>
    </div></td>
  </tr>`;
}

/**
 * Persist a user's selected role through the protected database function.
 * @param {string} id - Target auth user UUID.
 * @returns {Promise<void>}
 */
async function save(id) {
  const tr = document.querySelector('tr.editing');
  if (!tr) return;

  const role = tr.querySelector('[data-role]').value;
  const result = await wait(db.rpc('admin_update_user_role', {
    p_user_id: id,
    p_role: role
  }));

  if (result.error) {
    alert(`Unable to update user: ${result.error.message}`);
    return;
  }
  await load();
}

/** Permanently remove a user after explicit confirmation. */
async function remove(id) {
  if (!confirm('Delete this user? This action cannot be undone.')) return;
  const result = await wait(db.rpc('admin_delete_user', { p_user_id: id }));
  if (result.error) {
    alert(`Unable to remove user: ${result.error.message}`);
    return;
  }
  await load();
}

/** Bind actions to the currently rendered table controls. */
function bind() {
  document.querySelectorAll('[data-edit]').forEach(button => {
    button.onclick = () => { editing = String(button.dataset.edit); render(); };
  });
  document.querySelectorAll('[data-cancel]').forEach(button => {
    button.onclick = () => { editing = null; render(); };
  });
  document.querySelectorAll('[data-save]').forEach(button => {
    button.onclick = () => save(button.dataset.save);
  });
  document.querySelectorAll('[data-remove]').forEach(button => {
    button.onclick = () => remove(button.dataset.remove);
  });
}

$('search')?.addEventListener('input', render);
$('role')?.addEventListener('change', render);
$('refresh')?.addEventListener('click', load);
$('logout')?.addEventListener('click', async () => {
  await db.auth.signOut({ scope: 'local' });
  location.replace('admin.html');
});
db.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_OUT') location.replace('admin.html');
});

load();
