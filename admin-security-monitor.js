/**
 * Admin Security & IP Monitor.
 * Reads the protected admin_security_access_report RPC and presents
 * IP-level pressure indicators plus recent authentication events.
 * Risk scores are heuristic signals only; they are not a definitive
 * cybersecurity verdict and should be reviewed by an administrator.
 */
(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const auth = window.PanamaAdminAuth;
  let db = null;

  function severityClass(level) {
    return `severity severity-${String(level || 'normal').toLowerCase()}`;
  }

  function render(rows) {
    const byIp = new Map();
    for (const row of rows) {
      const ip = row.ip_address || 'Unknown / unavailable';
      const item = byIp.get(ip) || { ip, events: 0, failures: 0, maxRisk: 0, severity: 'normal', last: row.occurred_at };
      item.events += 1;
      if (/invalid|failed|error/i.test(JSON.stringify(row.payload || {}))) item.failures += 1;
      item.maxRisk = Math.max(item.maxRisk, Number(row.risk_score || 0));
      if (['critical','high','medium'].indexOf(String(row.severity).toLowerCase()) > ['critical','high','medium'].indexOf(item.severity)) item.severity = row.severity;
      if (new Date(row.occurred_at) > new Date(item.last)) item.last = row.occurred_at;
      byIp.set(ip, item);
    }
    const ips = [...byIp.values()].sort((a,b) => (b.maxRisk-a.maxRisk) || (b.events-a.events));
    const high = ips.filter(x => x.severity === 'high').length;
    const critical = ips.filter(x => x.severity === 'critical').length;
    $('statEvents').textContent = rows.length;
    $('statIps').textContent = ips.length;
    $('statHigh').textContent = high;
    $('statCritical').textContent = critical;

    $('ipTableWrap').innerHTML = ips.length ? `<table class="security-table"><thead><tr><th>IP address</th><th>Events</th><th>Failures</th><th>Risk</th><th>Severity</th><th>Last seen</th></tr></thead><tbody>${ips.map(x => `<tr><td><code>${esc(x.ip)}</code></td><td>${x.events}</td><td>${x.failures}</td><td>${x.maxRisk}</td><td><span class="${severityClass(x.severity)}">${esc(x.severity)}</span></td><td>${esc(new Date(x.last).toLocaleString())}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">No authentication events were recorded in this window.</div>';

    $('eventTableWrap').innerHTML = rows.length ? `<table class="security-table"><thead><tr><th>Time</th><th>IP</th><th>Event</th><th>Severity</th><th>Risk</th></tr></thead><tbody>${rows.slice(0,250).map(r => `<tr><td>${esc(new Date(r.occurred_at).toLocaleString())}</td><td><code>${esc(r.ip_address || '—')}</code></td><td>${esc(r.event_name || 'unknown')}</td><td><span class="${severityClass(r.severity)}">${esc(r.severity)}</span></td><td>${Number(r.risk_score||0)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">No recent events.</div>';
  }

  async function load() {
    if (!db) return;
    $('ipTableWrap').innerHTML = '<div class="loading">Loading security events…</div>';
    $('eventTableWrap').innerHTML = '<div class="loading">Loading events…</div>';
    const hours = Number($('securityWindow').value || 168);
    const { data, error } = await db.rpc('admin_security_access_report', { p_hours: hours });
    if (error) {
      $('ipTableWrap').innerHTML = `<div class="empty-state error-state">Unable to load security report: ${esc(error.message || error)}</div>`;
      $('eventTableWrap').innerHTML = '';
      return;
    }
    render(Array.isArray(data) ? data : []);
  }

  async function start() {
    try {
      if (!auth?.ready) return;
      db = await auth.ready;
      const { data } = await db.auth.getUser();
      if (!data?.user) { window.location.href = 'admin.html?returnTo=admin-security-monitor.html'; return; }
      $('refreshSecurity')?.addEventListener('click', load);
      $('securityWindow')?.addEventListener('change', load);
      await load();
    } catch (error) {
      $('ipTableWrap').innerHTML = `<div class="empty-state error-state">Security monitor unavailable: ${esc(error.message || error)}</div>`;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
