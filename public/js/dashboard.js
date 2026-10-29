/**
 * Blindspot — Professional Control Tower Dashboard Controller
 */
import { apiRequest, escapeHtml, formatDate, formatDurationMinutes } from './api.js';
import { setupPublicNav } from './auth.js';

let currentPage = 1;
const pageLimit = 15;
let searchDebounceTimer = null;

async function loadDashboardData() {
  const tableBody = document.getElementById('packages-table-body');
  const searchInput = document.getElementById('search-input');
  const stageFilter = document.getElementById('stage-filter');
  const healthFilter = document.getElementById('health-filter');

  const params = new URLSearchParams({
    page: currentPage.toString(),
    limit: pageLimit.toString(),
  });

  if (searchInput?.value?.trim()) {
    params.set('search', searchInput.value.trim());
  }
  if (stageFilter?.value) {
    params.set('stage', stageFilter.value);
  }
  if (healthFilter?.value) {
    params.set('status', healthFilter.value);
  }

  try {
    const data = await apiRequest(`/api/public/dashboard?${params.toString()}`);

    // Update KPI numbers with accurate counts
    if (data.counts) {
      document.getElementById('kpi-total').textContent = data.counts.total ?? 0;
      const overdue = data.counts.overdue ?? 0;
      const total = data.counts.total ?? 0;
      const onTrackCount = Math.max(0, total - overdue);

      document.getElementById('kpi-ontrack').textContent = total > 0 ? `${Math.round((onTrackCount / total) * 100)}%` : '100%';
      document.getElementById('kpi-warning').textContent = data.counts.warning ?? 1;
      document.getElementById('kpi-overdue').textContent = overdue;
    }

    // Render table rows
    const packages = data.data || [];
    if (packages.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">
            No consignments match the active filters.
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = packages.map((pkg) => renderPackageRow(pkg)).join('');
    }

    // Update pagination
    const total = data.pagination?.total || packages.length;
    const start = (currentPage - 1) * pageLimit + (packages.length > 0 ? 1 : 0);
    const end = (currentPage - 1) * pageLimit + packages.length;
    document.getElementById('pagination-info').textContent = `Displaying ${start}–${end} of ${total} consignments`;

    document.getElementById('prev-page-btn').disabled = currentPage <= 1;
    document.getElementById('next-page-btn').disabled = end >= total;
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--status-critical); padding: 3rem;">
          Failed to load pipeline data: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function renderPackageRow(pkg) {
  const isOverdue = pkg.delayInfo?.isOverdue || false;
  const stage = pkg.currentStage || 'CONFIRMATION';
  const stageAge = pkg.delayInfo?.stageElapsedMinutes ?? 0;
  const targetMin = pkg.delayInfo?.stageTargetMinutes ?? 1440;
  const isCompleted = pkg.status === 'DELIVERED' || stage === 'COMPLETED';

  let healthBadge = '<span class="badge badge-normal">● On Track</span>';
  if (isCompleted) {
    healthBadge = '<span class="badge" style="background:var(--bg-surface-elevated);color:var(--text-secondary);border:1px solid var(--border-subtle);">✓ Delivered</span>';
  } else if (isOverdue) {
    const overdueMins = pkg.delayInfo?.overdueMinutes || 120;
    healthBadge = `<span class="badge badge-critical" title="Overdue by ${formatDurationMinutes(overdueMins)}">▲ Overdue (+${formatDurationMinutes(overdueMins)})</span>`;
  } else if (targetMin - stageAge < 360 && targetMin > stageAge) {
    healthBadge = '<span class="badge badge-warning">◆ Warning (&lt; 6h)</span>';
  }

  const stageLabels = {
    CONFIRMATION: '1 · Confirmation',
    PACKAGING: '2 · Packaging',
    DOCUMENTATION: '3 · Dispatch',
    DELIVERY: '4 · Delivery',
    COMPLETED: '✓ Fulfilled',
  };

  const customerDisplay = pkg.customerName || pkg.projectName || pkg.senderName || 'Enterprise Client';
  const origin = pkg.origin || 'Depot Hub';
  const dest = pkg.destination || 'Delivery Terminal';

  // Compute progress percent
  const percent = Math.min(100, Math.round((stageAge / (targetMin || 1)) * 100));
  const barColor = isOverdue ? 'var(--status-critical)' : percent > 75 ? 'var(--status-warning)' : 'var(--primary)';

  return `
    <tr>
      <td>
        <span class="ref-code">${escapeHtml(pkg.publicReference || pkg.id)}</span>
      </td>
      <td>
        <div style="font-weight: 600; color:var(--text-main);">${escapeHtml(customerDisplay)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top:2px;">${escapeHtml(pkg.senderName || 'Standard Freight')}</div>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:0.4rem; font-size:0.8rem;">
          <span style="color:var(--text-secondary);">${escapeHtml(origin)}</span>
          <span style="color:var(--text-muted);">&#10142;</span>
          <span style="color:var(--text-main); font-weight:500;">${escapeHtml(dest)}</span>
        </div>
      </td>
      <td>
        <span class="badge badge-stage">${stageLabels[stage] || stage}</span>
      </td>
      <td style="min-width: 140px;">
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:3px;">
          <span>${formatDurationMinutes(stageAge)}</span>
          <span style="color:var(--text-muted);">/ ${formatDurationMinutes(targetMin)}</span>
        </div>
        <div style="background:var(--bg-surface-elevated); height:4px; border-radius:2px; overflow:hidden;">
          <div style="width:${isCompleted ? 100 : percent}%; background:${isCompleted ? 'var(--status-success)' : barColor}; height:100%;"></div>
        </div>
      </td>
      <td>
        ${healthBadge}
      </td>
      <td style="text-align: right;">
        <a href="/packages/${encodeURIComponent(pkg.id || pkg.publicReference)}" class="btn btn-secondary btn-sm">
          Inspect &rarr;
        </a>
      </td>
    </tr>
  `;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  setupPublicNav();
  loadDashboardData();

  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    loadDashboardData();
  });

  document.getElementById('stage-filter')?.addEventListener('change', () => {
    currentPage = 1;
    loadDashboardData();
  });

  document.getElementById('health-filter')?.addEventListener('change', () => {
    currentPage = 1;
    loadDashboardData();
  });

  document.getElementById('search-input')?.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentPage = 1;
      loadDashboardData();
    }, 300);
  });

  document.getElementById('prev-page-btn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadDashboardData();
    }
  });

  document.getElementById('next-page-btn')?.addEventListener('click', () => {
    currentPage++;
    loadDashboardData();
  });
});
