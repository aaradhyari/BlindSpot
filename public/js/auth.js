/**
 * Blindspot — Client Authentication and RBAC Route Guard
 */
import { apiRequest, showToast } from './api.js';

let currentUser = null;

export async function getCurrentUser() {
  if (currentUser) return currentUser;
  try {
    currentUser = await apiRequest('/api/auth/me');
    return currentUser;
  } catch {
    currentUser = null;
    return null;
  }
}

/**
 * Guard a page by verifying authentication and role authorization
 * @param {string[]} allowedRoles - List of allowed roles (e.g. ['ADMIN', 'CONFIRM'])
 */
export async function requireAuth(allowedRoles = []) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${currentPath}`;
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== 'ADMIN') {
      window.location.href = '/access-denied';
      return null;
    }

    renderUserHeader(user);
    return user;
  } catch {
    window.location.href = '/login';
    return null;
  }
}

/**
 * Optional authentication loader for public views
 */
export async function setupPublicNav() {
  try {
    const user = await getCurrentUser();
    if (user) {
      renderUserHeader(user);
    } else {
      renderGuestHeader();
    }
  } catch {
    renderGuestHeader();
  }
}

export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  } catch (err) {
    showToast(err.message || 'Logout failed.', 'error');
  }
}

function renderUserHeader(user) {
  const container = document.getElementById('nav-user-area');
  if (!container) return;

  const roleClass = (user.role || '').toLowerCase();
  container.innerHTML = `
    <div class="user-badge">
      <span style="font-weight: 600;">${user.name}</span>
      <span class="role-pill ${roleClass}">${user.role}</span>
    </div>
    <button id="logout-btn" class="btn btn-secondary btn-sm" title="Sign out">
      Sign Out
    </button>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', logout);
}

function renderGuestHeader() {
  const container = document.getElementById('nav-user-area');
  if (!container) return;

  container.innerHTML = `
    <a href="/login" class="btn btn-primary btn-sm">Employee Sign In</a>
  `;
}
