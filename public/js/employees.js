/**
 * Blindspot — Employee Management Controller (Admin Only)
 */
import { apiRequest, escapeHtml, formatDate, showToast } from './api.js';
import { requireAuth } from './auth.js';

let employees = [];

export async function initEmployees() {
  const user = await requireAuth(['ADMIN']);
  if (!user) return;

  loadEmployees();

  document.getElementById('add-employee-btn')?.addEventListener('click', () => {
    document.getElementById('employee-modal')?.classList.add('open');
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  document.getElementById('employee-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('modal-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    const payload = {
      name: document.getElementById('emp-name').value.trim(),
      email: document.getElementById('emp-email').value.trim(),
      password: document.getElementById('emp-password').value,
      role: document.getElementById('emp-role').value,
    };

    try {
      await apiRequest('/api/admin/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast(`Employee ${payload.name} created successfully!`, 'success');
      closeModal();
      document.getElementById('employee-form').reset();
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Employee Account';
    }
  });
}

function closeModal() {
  document.getElementById('employee-modal')?.classList.remove('open');
}

async function loadEmployees() {
  const tbody = document.getElementById('employees-table-body');
  try {
    employees = await apiRequest('/api/admin/employees');
    if (!employees || employees.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:3rem; color:var(--text-muted);">
            No employees registered. Click '+ Add Employee' to create an account.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = employees.map((emp) => {
      const roleClass = (emp.role || '').toLowerCase();
      const statusBadge = emp.enabled
        ? '<span class="badge badge-normal">Active</span>'
        : '<span class="badge badge-critical">Disabled</span>';

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${escapeHtml(emp.name)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${escapeHtml(emp.uid)}</div>
          </td>
          <td>${escapeHtml(emp.email)}</td>
          <td>
            <select class="form-select role-select" data-uid="${escapeHtml(emp.uid)}" style="width: auto; padding: 0.35rem 0.6rem; font-size: 0.8rem;">
              <option value="ADMIN" ${emp.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
              <option value="CONFIRM" ${emp.role === 'CONFIRM' ? 'selected' : ''}>CONFIRM</option>
              <option value="PACK" ${emp.role === 'PACK' ? 'selected' : ''}>PACK</option>
              <option value="DOC" ${emp.role === 'DOC' ? 'selected' : ''}>DOC</option>
              <option value="DEL" ${emp.role === 'DEL' ? 'selected' : ''}>DEL</option>
            </select>
          </td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm ${emp.enabled ? 'btn-danger' : 'btn-success'} toggle-btn" data-uid="${escapeHtml(emp.uid)}" data-enabled="${emp.enabled}">
              ${emp.enabled ? 'Disable' : 'Enable'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach role change listeners
    document.querySelectorAll('.role-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const uid = sel.getAttribute('data-uid');
        const role = sel.value;
        try {
          await apiRequest(`/api/admin/employees/${uid}`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
          });
          showToast(`Role updated to ${role}`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
          loadEmployees();
        }
      });
    });

    // Attach toggle status listeners
    document.querySelectorAll('.toggle-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = btn.getAttribute('data-uid');
        const currentlyEnabled = btn.getAttribute('data-enabled') === 'true';
        try {
          await apiRequest(`/api/admin/employees/${uid}`, {
            method: 'PATCH',
            body: JSON.stringify({ enabled: !currentlyEnabled }),
          });
          showToast(`Employee ${currentlyEnabled ? 'disabled' : 'enabled'} successfully.`, 'info');
          loadEmployees();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}
