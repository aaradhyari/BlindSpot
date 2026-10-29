/**
 * Blindspot — Package Deep Dive & Bottleneck Visualizer
 */
import { apiRequest, escapeHtml, formatDate, formatDurationMinutes, showToast } from './api.js';
import { setupPublicNav } from './auth.js';

async function initPackageDetails() {
  setupPublicNav();

  // Extract ID from pathname: /packages/:id or query param ?id=...
  const pathParts = window.location.pathname.split('/');
  let packageId = pathParts[2];
  if (!packageId || packageId === 'package-details') {
    const params = new URLSearchParams(window.location.search);
    packageId = params.get('id') || params.get('ref');
  }

  if (!packageId) {
    document.getElementById('details-loading').innerHTML = `
      <div style="color:var(--status-critical);text-align:center;padding:3rem;">
        No package identifier specified in URL.
      </div>
    `;
    return;
  }

  try {
    const pkg = await apiRequest(`/api/packages/${encodeURIComponent(packageId)}`);
    renderPackageView(pkg);

    // Load audit history
    loadAuditHistory(pkg.id || pkg.publicReference);
  } catch (err) {
    document.getElementById('details-loading').innerHTML = `
      <div style="color:var(--status-critical);text-align:center;padding:3rem;">
        Failed to load package: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function renderPackageView(pkg) {
  document.getElementById('details-loading').style.display = 'none';
  document.getElementById('details-content').style.display = 'block';

  // Basic header info
  document.getElementById('display-ref').textContent = pkg.publicReference;
  document.getElementById('display-customer').textContent = pkg.customerName || pkg.senderName || 'Standard Consignment';
  document.getElementById('display-created').textContent = formatDate(pkg.createdAt);
  document.getElementById('display-origin').textContent = pkg.origin || 'Depot';
  document.getElementById('display-destination').textContent = pkg.destination || 'Delivery Point';
  document.getElementById('display-expected').textContent = formatDate(pkg.expectedDeliveryDate);

  // Status & Priority
  const isOverdue = pkg.delayAnalysis?.isOverdue || pkg.delayInfo?.isOverdue;
  const statusBadge = document.getElementById('display-status-badge');
  if (pkg.status === 'COMPLETED' || pkg.currentStage === 'COMPLETED') {
    statusBadge.className = 'badge badge-normal';
    statusBadge.textContent = '✓ Fulfilled & Delivered';
  } else if (isOverdue) {
    statusBadge.className = 'badge badge-critical';
    statusBadge.textContent = `⚠ BOTTLENECK: OVERDUE (+${formatDurationMinutes(pkg.delayAnalysis?.overdueMinutes || pkg.delayInfo?.overdueMinutes)})`;
  } else {
    statusBadge.className = 'badge badge-normal';
    statusBadge.textContent = '• On Track';
  }

  // Render Workflow Stepper (CONFIRMATION, PACKAGING, DOCUMENTATION, DELIVERY)
  renderStepper(pkg);

  // Render Bottleneck & Root Cause Q&A Card
  renderBottleneckQA(pkg);
}

function renderStepper(pkg) {
  const stages = [
    { key: 'CONFIRMATION', label: '1. Confirmation' },
    { key: 'PACKAGING', label: '2. Packaging' },
    { key: 'DOCUMENTATION', label: '3. Documentation' },
    { key: 'DELIVERY', label: '4. Delivery' },
  ];

  const currentIdx = stages.findIndex((s) => s.key === pkg.currentStage);
  const isCompleted = pkg.status === 'COMPLETED' || pkg.currentStage === 'COMPLETED';

  const stepperHtml = stages.map((stage, idx) => {
    let stateClass = '';
    const stageData = pkg.stageTimestamps?.[stage.key];
    const isStageOverdue = pkg.delayAnalysis?.stageBreakdown?.[stage.key]?.isOverdue;

    if (isCompleted || (currentIdx > -1 && idx < currentIdx)) {
      stateClass = 'completed';
    } else if (currentIdx === idx) {
      stateClass = isStageOverdue ? 'delayed' : 'active';
    }

    let subText = 'Pending';
    if (stageData?.completedAt) {
      subText = `Done ${formatDate(stageData.completedAt)}`;
    } else if (stageData?.enteredAt) {
      subText = `In Progress`;
    }

    return `
      <div class="step-item ${stateClass}">
        <div class="step-circle">${idx + 1}</div>
        <div class="step-title">${stage.label}</div>
        <div class="step-sub">${subText}</div>
      </div>
    `;
  }).join('');

  document.getElementById('stepper-container').innerHTML = stepperHtml;
}

function renderBottleneckQA(pkg) {
  const analysis = pkg.delayAnalysis || {};
  const isOverdue = analysis.isOverdue;

  const roleResponsibilityMap = {
    CONFIRMATION: 'CONFIRM (Order Desk / Inventory Verification Officer)',
    PACKAGING: 'PACK (Fulfillment & Boxing Operations Lead)',
    DOCUMENTATION: 'DOC (Customs / Logistics Documentation Dispatcher)',
    DELIVERY: 'DEL (Carrier Operations & Last-Mile Supervisor)',
  };

  const responsible = roleResponsibilityMap[pkg.currentStage] || 'Logistics Coordinator';

  document.getElementById('qa-where').textContent = isOverdue
    ? `Delayed at Stage: ${pkg.currentStage}`
    : `Currently processing normally at: ${pkg.currentStage || 'COMPLETED'}`;

  document.getElementById('qa-how-long').textContent = isOverdue
    ? `${formatDurationMinutes(analysis.overdueMinutes)} past SLA target threshold`
    : `Within SLA limit (${formatDurationMinutes(analysis.stageElapsedMinutes || 0)} elapsed)`;

  const delayReason = analysis.primaryDelayReason || pkg.delayInfo?.primaryReason || 'No bottleneck reported';
  const delayNotes = analysis.delayNotes || pkg.delayInfo?.delayNotes || 'Operational metrics within standard limits';

  document.getElementById('qa-why').innerHTML = `
    <strong>${escapeHtml(delayReason)}</strong>
    <p style="margin-top:0.25rem; font-size:0.85rem; color:var(--text-secondary);">${escapeHtml(delayNotes)}</p>
  `;

  document.getElementById('qa-who').textContent = isOverdue
    ? `${responsible} (Action Overdue)`
    : responsible;

  document.getElementById('qa-action').textContent = isOverdue
    ? (analysis.nextActionRecommended || 'Escalate to facility supervisor; initiate bottleneck remediation.')
    : 'Monitor automated SLA timers and advance stage once physical handover is validated.';
}

async function loadAuditHistory(pkgId) {
  const historyList = document.getElementById('history-timeline');
  try {
    const history = await apiRequest(`/api/packages/${encodeURIComponent(pkgId)}/history`);
    if (!history || history.length === 0) {
      historyList.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">No historical events logged yet.</div>';
      return;
    }

    historyList.innerHTML = history.map((h) => `
      <div style="position:relative; padding-left:1.5rem; border-left:2px solid var(--border-subtle); margin-bottom:1.25rem;">
        <div style="position:absolute; left:-7px; top:0; width:12px; height:12px; border-radius:50%; background:var(--accent-primary);"></div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:0.9rem; color:#ffffff;">${escapeHtml(h.action || 'Stage Event')}</strong>
          <span style="font-size:0.75rem; color:var(--text-muted);">${formatDate(h.timestamp)}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">
          By: <span class="ref-code">${escapeHtml(h.performedBy || 'System')}</span>
          ${h.stage ? ` &bull; Stage: <strong>${escapeHtml(h.stage)}</strong>` : ''}
        </div>
        ${h.notes ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem; background:var(--bg-input); padding:0.4rem 0.6rem; border-radius:var(--radius-sm);">${escapeHtml(h.notes)}</div>` : ''}
      </div>
    `).join('');
  } catch (err) {
    historyList.innerHTML = `<div style="color:var(--status-critical);font-size:0.85rem;">Failed to load audit history: ${escapeHtml(err.message)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', initPackageDetails);
