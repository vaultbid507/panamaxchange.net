(() => {
  /**
   * PanamaXChange — real-time Admin audit log viewer.
   *
   * Process:
   * 1. Reuse the canonical Admin Supabase client exposed by admin-auth.js.
   * 2. Load the latest audit entries through the staff-only RPC.
   * 3. Subscribe to audit_logs INSERT events through Supabase Realtime.
   * 4. Add new events to the top of the table without requiring a refresh.
   * 5. Filter the local event stream by text, event type, and entity area.
   * 6. Keep timestamps in the visitor's local timezone while preserving the
   *    original UTC timestamp in the title attribute.
   */
  let events = [];
  let channel = null;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'
  }[c]));

  /** Format an audit timestamp for the operator's local timezone. */
  function formatTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  /** Normalize a display event class without trusting database content. */
  function eventClass(value) {
    const allowed = new Set(['login','logout','insert','update','delete','security']);
    return allowed.has(String(value)) ? String(value) : '';
  }

  /** Render the currently filtered local audit stream. */
  function render() {
    const query = ($('auditSearch').value || '').trim().toLowerCase();
    const eventFilter = $('auditEventFilter').value;
    const tableFilter = $('auditTableFilter').value;

    const visible = events.filter(item => {
      const haystack = [
        item.summary,
        item.actor_email,
        item.actor_name,
        item.event_type,
        item.entity_table,
        item.entity_id,
        item.source
      ].join(' ').toLowerCase();
      return (!query || haystack.includes(query))
        && (!eventFilter || item.event_type === eventFilter)
        && (!tableFilter || item.entity_table === tableFilter);
    });

    $('auditCount').textContent = `${visible.length} ${visible.length === 1 ? 'event' : 'events'}`;
    $('auditRows').innerHTML = visible.length ? visible.map(item => `
      <tr class="audit-row">
        <td title="${esc(item.occurred_at)}">${esc(formatTime(item.occurred_at))}</td>
        <td class="audit-user">
          <strong>${esc(item.actor_name || 'System')}</strong>
          <span>${esc(item.actor_email || '')}</span>
        </td>
        <td><span class="event-pill ${esc(eventClass(item.event_type))}">${esc(item.event_type || 'event')}</span></td>
        <td>${esc(item.entity_table || '—')}</td>
        <td>${esc(item.entity_id || '—')}</td>
        <td><strong>${esc(item.summary || 'Activity recorded')}</strong><span class="audit-muted">${esc(item.details ? JSON.stringify(item.details) : '')}</span></td>
        <td>${esc(item.source || '—')}</td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="audit-empty">No audit events match the current filters.</td></tr>';
  }

  /** Load the most recent audit events visible to administrators/moderators. */
  async function load() {
    const client = window.PanamaAdminAuth?.client;
    if (!client) {
      $('auditMessage').textContent = 'Admin authentication is still initializing.';
      $('auditMessage').className = 'audit-message error';
      return;
    }

    const session = await client.auth.getSession();
    if (session.error || !session.data?.session) {
      location.replace('admin.html?returnTo=admin-audit-log.html');
      return;
    }

    const result = await client.rpc('admin_list_audit_logs', { p_limit: 250 });
    if (result.error) {
      $('auditMessage').textContent = `Unable to load audit log: ${result.error.message}`;
      $('auditMessage').className = 'audit-message error';
      return;
    }

    events = Array.isArray(result.data) ? result.data : [];
    $('auditMessage').textContent = '';
    render();
  }

  /** Add a newly received realtime event to the local log and render immediately. */
  function pushRealtime(row) {
    if (!row?.id) return;
    if (events.some(item => String(item.id) === String(row.id))) return;
    events.unshift(row);
    events = events.slice(0, 250);
    render();
    const first = $('auditRows').querySelector('tr');
    first?.classList.add('audit-new');
  }

  /** Subscribe to database audit inserts so the log updates without refresh. */
  function subscribe() {
    const client = window.PanamaAdminAuth?.client;
    if (!client) return;

    if (channel) client.removeChannel(channel);
    channel = client.channel('panamaxchange-audit-live')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'audit_logs'
      }, async payload => {
        // The realtime payload only contains the raw row, so reload the single
        // newest record through the staff RPC to include actor email/name.
        const latest = await client.rpc('admin_list_audit_logs', { p_limit: 1 });
        if (!latest.error && latest.data?.[0]) pushRealtime(latest.data[0]);
      })
      .subscribe(status => {
        const dot = $('liveDot');
        const state = $('liveState');
        if (status === 'SUBSCRIBED') {
          dot?.classList.add('ready');
          if (state) state.textContent = 'Live updates connected';
        } else {
          dot?.classList.remove('ready');
          if (state) state.textContent = 'Live connection waiting';
        }
      });
  }

  /** Record a successful audit logout event before ending the shared session. */
  async function logout() {
    const client = window.PanamaAdminAuth?.client;
    try {
      if (client) await client.rpc('record_audit_event', {
        p_event_type: 'logout',
        p_summary: 'Administrator signed out',
        p_source: 'admin-auth'
      });
    } finally {
      await window.PanamaAdminAuth?.signOut?.();
    }
  }

  /** Initialize filters, shared Admin auth, data, and realtime updates. */
  function start() {
    $('auditSearch').addEventListener('input', render);
    $('auditEventFilter').addEventListener('change', render);
    $('auditTableFilter').addEventListener('change', render);
    $('refreshAudit').addEventListener('click', load);
    $('logoutAudit').addEventListener('click', logout);
    load().then(subscribe);

    window.addEventListener('beforeunload', () => {
      const client = window.PanamaAdminAuth?.client;
      if (channel && client) client.removeChannel(channel);
    });
  }

  document.addEventListener('DOMContentLoaded', start);
})();
