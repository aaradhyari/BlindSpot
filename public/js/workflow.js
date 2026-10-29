/**
 * Blindspot — Shared Workflow Stage Station Controller
 */
import { apiRequest, escapeHtml, formatDate, formatDurationMinutes, showToast } from './api.js';
import { requireAuth } from './auth.js';

export const DELAY_REASONS_OPTIONS = [
  { value: 'SUPPLIER_DELAY', label: 'Supplier Delay' },
  { value: 'MATERIAL_SHORTAGE', label: 'Material / Stock Shortage' },
  { value: 'PACKAGING_DAMAGE', label: 'Packaging Damage / Repack' },
  { value: 'EQUIPMENT_BREAKDOWN', label: 'Equipment / Machine Breakdown' },
  { value: 'CUSTOMS_OR_REGULATORY', label: 'Customs / Regulatory Hold' },
  { value: 'DOCUMENTATION_ERROR', label: 'Documentation / Invoice Error' },
  { value: 'CARRIER_UNAVAILABLE', label: 'Carrier Unavailable' },
  { value: 'WEATHER_OR_TRAFFIC', label: 'Weather / Transit Delay' },
  { value: 'CUSTOMER_RESCHEDULE', label: 'Customer Rescheduled' },
  { value: 'OTHER', label: 'Other Reason (Specify)' },
];

export async function initWorkflowStation({ stage, role, title, endpoint, fieldsRenderer, collectPayload }) {
  // 1. Guard page
  const user = await requireAuth([role, 'ADMIN']);
  if (!user) return;

  // 2. Setup state
  let activePackage = null;

  async function loadPackages() {
    const listContainer = document.getElementById('stage-packages-body');
    if (!listContainer) return;

    try {
      const result = await apiRequest(`/api/packages?stage=${stage}&limit=50`);
      const packages = result.data || [];

      document.getElementById('station-count').textContent = packages.length;

      if (packages.length === 0) {
        listContainer.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">
              No packages currently pending in ${escapeHtml(title)}.
            </td>
          </tr>
        `;
        return;
      }

      listContainer.innerHTML = packages.map((pkg) => {
        const isOverdue = pkg.delayInfo?.isOverdue;
        const elapsed = pkg.delayInfo?.stageElapsedMinutes ?? 0;
        const target = pkg.delayInfo?.stageTargetMinutes ?? 1440;

        let statusBadge = '<span class="badge badge-normal">On Track</span>';
        if (isOverdue) {
          statusBadge = `<span class="badge badge-critical">&#9888; Overdue (+${formatDurationMinutes(pkg.delayInfo.overdueMinutes)})</span>`;
        } else if (target - elapsed < 360) {
          statusBadge = '<span class="badge badge-warning">&#9888; SLA Warning</span>';
        }

        return `
          <tr>
            <td><strong class="ref-code">${escapeHtml(pkg.publicReference)}</strong></td>
            <td>
              <div style="font-weight:600;">${escapeHtml(pkg.customerName || pkg.senderName || 'Consignment')}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(pkg.origin)} &rarr; ${escapeHtml(pkg.destination)}</div>
            </td>
            <td>
              <div>${formatDurationMinutes(elapsed)} <span style="font-size:0.75rem;color:var(--text-muted);">/ ${formatDurationMinutes(target)}</span></div>
            </td>
            <td>${statusBadge}</td>
            <td>${formatDate(pkg.createdAt)}</td>
            <td>
              <button class="btn btn-primary btn-sm action-btn" data-pkg-id="${escapeHtml(pkg.id)}" data-pkg='${escapeHtml(JSON.stringify(pkg))}'>
                Process Stage &rarr;
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Attach button clicks
      document.querySelectorAll('.action-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pkgData = JSON.parse(btn.getAttribute('data-pkg'));
          openActionModal(pkgData);
        });
      });
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function openActionModal(pkg) {
    activePackage = pkg;
    const modalBackdrop = document.getElementById('action-modal');
    const modalTitle = document.getElementById('modal-pkg-ref');
    const customFields = document.getElementById('custom-stage-fields');
    const delaySection = document.getElementById('delay-reason-section');

    modalTitle.textContent = `${title} — Package ${pkg.publicReference}`;
    customFields.innerHTML = fieldsRenderer(pkg);

    // Show delay reason section if overdue or let operator voluntarily flag delay
    const isOverdue = pkg.delayInfo?.isOverdue;
    delaySection.innerHTML = `
      <div style="background-color: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 1rem; margin-top: 1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
          <label style="font-weight:600; font-size:0.875rem; color:${isOverdue ? 'var(--status-critical)' : 'var(--text-secondary)'};">
            ${isOverdue ? '&#9888; Stage Overdue — Bottleneck Root Cause Required' : 'Log Delay / Bottleneck Reason (Optional)'}
          </label>
        </div>
        <div class="form-group" style="margin-bottom:0.75rem;">
          <select id="modal-delay-reason" class="form-select" ${isOverdue ? 'required' : ''}>
            <option value="">${isOverdue ? '— Select Primary Root Cause (Required) —' : '— No Delay Detected —'}</option>
            ${DELAY_REASONS_OPTIONS.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <textarea id="modal-delay-notes" class="form-textarea" placeholder="Detailed explanation of delay cause and immediate corrective actions taken..."></textarea>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('open');
  }

  // Modal actions
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  function closeModal() {
    document.getElementById('action-modal')?.classList.remove('open');
    activePackage = null;
  }

  document.getElementById('modal-submit-btn')?.addEventListener('click', async () => {
    if (!activePackage) return;

    const delayReason = document.getElementById('modal-delay-reason')?.value || undefined;
    const delayNotes = document.getElementById('modal-delay-notes')?.value?.trim() || undefined;

    if (activePackage.delayInfo?.isOverdue && !delayReason) {
      showToast('Please select a bottleneck root cause before completing an overdue stage.', 'error');
      return;
    }

    let payload;
    try {
      payload = collectPayload();
    } catch (validationErr) {
      showToast(validationErr.message, 'error');
      return;
    }

    if (delayReason) {
      payload.delayReason = delayReason;
      payload.delayNotes = delayNotes;
    }

    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Committing stage update...';

    try {
      await apiRequest(`/api/workflow/${activePackage.id}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast(`Package advanced from ${title} successfully!`, 'success');
      closeModal();
      loadPackages();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Advance Stage';
    }
  });

  document.getElementById('refresh-btn')?.addEventListener('click', loadPackages);

  loadPackages();
}
