/**
 * Blindspot — Reporting & Bottleneck Analytics Controller
 */
import { apiRequest, escapeHtml, formatDurationMinutes, showToast } from './api.js';
import { requireAuth } from './auth.js';

export async function initReports() {
  const user = await requireAuth(['ADMIN']);
  if (!user) return;

  loadReportsData();

  document.getElementById('period-select')?.addEventListener('change', loadReportsData);
  document.getElementById('refresh-reports-btn')?.addEventListener('click', loadReportsData);

  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    const period = document.getElementById('period-select')?.value || 'this_week';
    window.location.href = `/api/admin/reports/export.csv?period=${encodeURIComponent(period)}`;
  });
}

async function loadReportsData() {
  const period = document.getElementById('period-select')?.value || 'this_week';

  try {
    const [summary, distribution] = await Promise.all([
      apiRequest(`/api/admin/reports/summary?period=${encodeURIComponent(period)}`),
      apiRequest(`/api/admin/reports/delays?period=${encodeURIComponent(period)}`),
    ]);

    // Render KPI Cards
    document.getElementById('rep-total-packages').textContent = summary.totalPackages ?? 0;
    document.getElementById('rep-delay-rate').textContent = `${summary.overallDelayRate ?? 0}%`;
    document.getElementById('rep-avg-delay').textContent = formatDurationMinutes(summary.avgDelayMinutes ?? 0);
    document.getElementById('rep-unresolved-actions').textContent = summary.unresolvedActions ?? 0;

    // Render Stage Bottlenecks
    renderStageDistribution(distribution);

    // Render Root Causes Pareto
    renderRootCauses(summary.reasonDistribution || {});
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderStageDistribution(stages) {
  const container = document.getElementById('stage-distribution-body');
  if (!container) return;

  if (!stages || stages.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;">No data for this period.</td></tr>';
    return;
  }

  container.innerHTML = stages.map((s) => {
    const delayRate = s.delayRate || 0;
    const barColor = delayRate > 30 ? 'var(--status-critical)' : delayRate > 15 ? 'var(--status-warning)' : 'var(--status-normal)';

    return `
      <tr>
        <td><strong>${escapeHtml(s.stage)}</strong></td>
        <td>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="flex:1; background:var(--bg-input); height:8px; border-radius:var(--radius-full); overflow:hidden;">
              <div style="width:${Math.min(delayRate, 100)}%; background:${barColor}; height:100%;"></div>
            </div>
            <span style="font-weight:700; width:45px;">${delayRate}%</span>
          </div>
        </td>
        <td>${s.delayCount} packages</td>
        <td>${formatDurationMinutes(s.avgDurationMinutes)}</td>
        <td style="color:${s.avgDelayMinutes > 0 ? 'var(--status-critical)' : 'var(--text-muted)'}; font-weight:600;">
          +${formatDurationMinutes(s.avgDelayMinutes)}
        </td>
      </tr>
    `;
  }).join('');
}

function renderRootCauses(reasons) {
  const container = document.getElementById('root-causes-list');
  if (!container) return;

  const entries = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:1.5rem;text-align:center;">No delay reasons recorded in this period.</div>';
    return;
  }

  const total = entries.reduce((acc, curr) => acc + curr[1], 0);

  container.innerHTML = entries.map(([reason, count]) => {
    const percent = Math.round((count / total) * 100);
    return `
      <div style="margin-bottom: 1.25rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-size:0.85rem;">
          <span style="font-weight:600; color:#ffffff;">${escapeHtml(reason.replace(/_/g, ' '))}</span>
          <span style="color:var(--text-secondary);">${count} occurrences (${percent}%)</span>
        </div>
        <div style="background:var(--bg-input); height:6px; border-radius:var(--radius-full); overflow:hidden;">
          <div style="width:${percent}%; background:var(--accent-primary); height:100%;"></div>
        </div>
      </div>
    `;
  }).join('');
}
