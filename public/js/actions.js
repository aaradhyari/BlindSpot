/**
 * Blindspot — Corrective Actions & Process Improvement Controller
 */
import { apiRequest, escapeHtml, formatDate, showToast } from './api.js';
import { requireAuth } from './auth.js';
import { DELAY_REASONS_OPTIONS } from './workflow.js';

let actions = [];
let verifyingActionId = null;

export async function initActions() {
  const user = await requireAuth(['ADMIN']);
  if (!user) return;

  loadActions();

  // Populate delay reason dropdown in modal
  const reasonSelect = document.getElementById('act-reason');
  if (reasonSelect) {
    reasonSelect.innerHTML = DELAY_REASONS_OPTIONS.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
  }

  // Create action modal handlers
  document.getElementById('create-action-btn')?.addEventListener('click', () => {
    document.getElementById('action-modal')?.classList.add('open');
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', closeActionModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeActionModal);

  document.getElementById('action-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving corrective plan...';

    const payload = {
      title: document.getElementById('act-title').value.trim(),
      description: document.getElementById('act-description').value.trim(),
      stage: document.getElementById('act-stage').value,
      delayReason: document.getElementById('act-reason').value,
      actionType: document.getElementById('act-type').value,
      owner: document.getElementById('act-owner').value.trim(),
      targetCompletionDate: new Date(document.getElementById('act-target-date').value).toISOString(),
    };

    try {
      await apiRequest('/api/admin/actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('Corrective action registered successfully!', 'success');
      closeActionModal();
      document.getElementById('action-form').reset();
      loadActions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Corrective Action';
    }
  });

  // Verification modal handlers
  document.getElementById('verify-close-btn')?.addEventListener('click', closeVerifyModal);
  document.getElementById('verify-cancel-btn')?.addEventListener('click', closeVerifyModal);

  document.getElementById('verify-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!verifyingActionId) return;

    const submitBtn = document.getElementById('verify-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Recording verification...';

    const payload = {
      preDelayRate: parseFloat(document.getElementById('ver-pre-rate').value),
      postDelayRate: parseFloat(document.getElementById('ver-post-rate').value),
      verifiedNotes: document.getElementById('ver-notes').value.trim() || undefined,
    };

    try {
      await apiRequest(`/api/admin/actions/${verifyingActionId}/verify`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('Action verification metrics recorded!', 'success');
      closeVerifyModal();
      loadActions();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Verification';
    }
  });

  document.getElementById('export-actions-csv')?.addEventListener('click', () => {
    window.location.href = '/api/admin/actions/export/csv';
  });
}

function closeActionModal() {
  document.getElementById('action-modal')?.classList.remove('open');
}

function closeVerifyModal() {
  document.getElementById('verify-modal')?.classList.remove('open');
  verifyingActionId = null;
}

async function loadActions() {
  const tbody = document.getElementById('actions-table-body');
  try {
    const res = await apiRequest('/api/admin/actions');
    actions = res.data || res || [];

    if (actions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:3rem; color:var(--text-muted);">
            No corrective actions logged. Click '+ Log Corrective Action' to create a root-cause remediation initiative.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = actions.map((act) => {
      let statusBadge = '<span class="badge badge-warning">OPEN</span>';
      if (act.status === 'RESOLVED') statusBadge = '<span class="badge badge-normal">RESOLVED</span>';
      if (act.status === 'VERIFIED') statusBadge = '<span class="badge badge-normal" style="background:rgba(59,130,246,0.2);color:#93c5fd;">VERIFIED</span>';
      if (act.status === 'IN_PROGRESS') statusBadge = '<span class="badge badge-warning">IN PROGRESS</span>';

      let impact = '—';
      if (act.verification) {
        const diff = act.verification.preDelayRate - act.verification.postDelayRate;
        const color = diff > 0 ? 'var(--status-normal)' : 'var(--status-critical)';
        impact = `<span style="color:${color};font-weight:700;">${diff > 0 ? '↓ ' : '↑ '}${Math.abs(diff).toFixed(1)}%</span> (${act.verification.preDelayRate}% &rarr; ${act.verification.postDelayRate}%)`;
      }

      return `
        <tr>
          <td>
            <div style="font-weight:700;">${escapeHtml(act.title)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(act.description || '')}</div>
          </td>
          <td>
            <span class="badge badge-stage">${escapeHtml(act.stage)}</span>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem;">${escapeHtml((act.delayReason || '').replace(/_/g, ' '))}</div>
          </td>
          <td>${statusBadge}</td>
          <td>${impact}</td>
          <td>${formatDate(act.targetCompletionDate || act.createdAt)}</td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              ${act.status !== 'VERIFIED' ? `
                <button class="btn btn-secondary btn-sm verify-btn" data-id="${escapeHtml(act.id)}">
                  Verify Impact &rarr;
                </button>
              ` : `
                <span style="font-size:0.8rem; color:var(--status-normal);">Completed</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach verify button handlers
    document.querySelectorAll('.verify-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        verifyingActionId = btn.getAttribute('data-id');
        const act = actions.find((a) => a.id === verifyingActionId);
        document.getElementById('verify-act-title').textContent = act?.title || 'Action';
        document.getElementById('verify-modal')?.classList.add('open');
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}
