/**
 * Blindspot — Public Dashboard Controller
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

    // Update KPI numbers
    if (data.counts) {
      document.getElementById('kpi-total').textContent = data.counts.total ?? 0;
      document.getElementById('kpi-ontrack').textContent = data.counts.onTrack ?? 0;
      document.getElementById('kpi-warning').textContent = data.counts.warning ?? 0;
      document.getElementById('kpi-overdue').textContent = data.counts.overdue ?? 0;
    }

    // Render table rows
    const packages = data.data || [];
    if (packages.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 3rem;">
            No packages match the current filter criteria.
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
    document.getElementById('pagination-info').textContent = `Showing ${start}-${end} of ${total} orders`;

    document.getElementById('prev-page-btn').disabled = currentPage <= 1;
    document.getElementById('next-page-btn').disabled = end >= total;
  } catch (err) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--status-critical); padding: 3rem;">
          Failed to load package data: ${escapeHtml(err.message)}
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

  let healthBadge = '<span class="badge badge-normal">On Track</span>';
  if (isOverdue) {
    const overdueMins = pkg.delayInfo?.overdueMinutes || 0;
    healthBadge = `<span class="badge badge-critical" title="Delayed by ${formatDurationMinutes(overdueMins)}">&#9888; OVERDUE (+${formatDurationMinutes(overdueMins)})</span>`;
  } else if (targetMin - stageAge < 360 && targetMin > stageAge) {
    healthBadge = '<span class="badge badge-warning">&#9888; Warning</span>';
  }

  const stageLabels = {
    CONFIRMATION: '1. Confirmation',
    PACKAGING: '2. Packaging',
    DOCUMENTATION: '3. Documentation',
    DELIVERY: '4. Delivery',
    COMPLETED: '✓ Delivered',
  };

  const customerDisplay = pkg.customerName || pkg.senderName || 'Standard Consignment';
  const dest = pkg.destination || 'In Transit';

  return `
    <tr>
      <td>
        <span class="ref-code">${escapeHtml(pkg.publicReference || pkg.id)}</span>
      </td>
      <td>
        <div style="font-weight: 600;">${escapeHtml(customerDisplay)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">From: ${escapeHtml(pkg.origin || 'Depot')}</div>
      </td>
      <td>
        <span class="badge badge-stage">${stageLabels[stage] || stage}</span>
      </td>
      <td>
        <div>${formatDurationMinutes(stageAge)} <span style="color:var(--text-muted);font-size:0.75rem;">/ ${formatDurationMinutes(targetMin)}</span></div>
      </td>
      <td>
        ${healthBadge}
      </td>
      <td>
        <span>${escapeHtml(dest)}</span>
      </td>
      <td>
        <a href="/packages/${encodeURIComponent(pkg.id || pkg.publicReference)}" class="btn btn-secondary btn-sm">
          Track &rarr;
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
    }, 350);
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
