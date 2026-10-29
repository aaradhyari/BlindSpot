/**
 * Blindspot — Reporting service
 * Generates weekly/monthly comparisons, trends, and CSV exports.
 */
import { db } from '../config/firebase.js';
import { COLLECTIONS, STAGES, STATUS, STAGE_ORDER, ACTION_STATUS } from '../constants/index.js';
import { getDateRange, toISO, csvSafe } from '../utils/index.js';
import { getDelayStatistics } from './delay.service.js';

/**
 * Get summary report for a given period.
 */
export async function getSummaryReport(period, startDate, endDate) {
  const { start, end } = getDateRange(period, startDate, endDate);
  const stats = await getDelayStatistics(start, end);

  // Count unresolved corrective actions
  const actionsSnap = await db.collection(COLLECTIONS.CORRECTIVE_ACTIONS)
    .where('status', 'in', ['OPEN', 'IN_PROGRESS'])
    .limit(500)
    .get();

  stats.unresolvedActions = actionsSnap.size;
  stats.period = { start: start.toISOString(), end: end.toISOString(), label: period };

  return stats;
}

/**
 * Get delay distribution by stage (for bar chart).
 */
export async function getDelayDistribution(period, startDate, endDate) {
  const { start, end } = getDateRange(period, startDate, endDate);
  const stats = await getDelayStatistics(start, end);

  return STAGE_ORDER.map((stage) => ({
    stage,
    delayCount: (stats.stageStats[stage]?.delayed || 0) + (stats.stageStats[stage]?.completedLate || 0),
    delayRate: stats.stageStats[stage]?.delayRate || 0,
    avgDelayMinutes: stats.stageStats[stage]?.avgDelayMinutes || 0,
    avgDurationMinutes: stats.stageStats[stage]?.avgDurationMinutes || 0,
  }));
}

/**
 * Get weekly comparison (this week vs last week).
 */
export async function getWeeklyComparison() {
  const thisWeek = await getSummaryReport('this_week');
  const lastWeek = await getSummaryReport('last_week');

  return buildComparison(thisWeek, lastWeek, 'This Week', 'Last Week');
}

/**
 * Get monthly comparison.
 */
export async function getMonthlyComparison() {
  const thisMonth = await getSummaryReport('this_month');
  const lastMonth = await getSummaryReport('last_month');

  return buildComparison(thisMonth, lastMonth, 'This Month', 'Last Month');
}

function buildComparison(current, previous, currentLabel, previousLabel) {
  const compare = (curr, prev) => {
    const diff = curr - prev;
    const pctChange = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
    return { current: curr, previous: prev, diff, pctChange };
  };

  return {
    labels: { current: currentLabel, previous: previousLabel },
    currentPeriod: current.period,
    previousPeriod: previous.period,
    metrics: {
      totalPackages: compare(current.totalPackages, previous.totalPackages),
      completedPackages: compare(current.completedPackages, previous.completedPackages),
      overduePackages: compare(current.overduePackages, previous.overduePackages),
      onTimeDeliveryRate: compare(current.onTimeDeliveryRate, previous.onTimeDeliveryRate),
      unresolvedActions: compare(current.unresolvedActions || 0, previous.unresolvedActions || 0),
    },
    stageComparison: STAGE_ORDER.map((stage) => ({
      stage,
      current: current.stageStats[stage] || {},
      previous: previous.stageStats[stage] || {},
      delayRateChange: compare(
        current.stageStats[stage]?.delayRate || 0,
        previous.stageStats[stage]?.delayRate || 0
      ),
    })),
    delayReasons: {
      current: current.topDelayReasons || [],
      previous: previous.topDelayReasons || [],
    },
  };
}

/**
 * Get trend data for charts (daily/weekly aggregation).
 */
export async function getTrends(period, startDate, endDate) {
  const { start, end } = getDateRange(period, startDate, endDate);
  const packagesRef = db.collection(COLLECTIONS.PACKAGES);
  const snap = await packagesRef.limit(1000).get();
  const packages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Group by day
  const days = {};
  let current = new Date(start);
  while (current < end) {
    const key = current.toISOString().slice(0, 10);
    days[key] = { created: 0, delivered: 0, delayed: 0 };
    current.setDate(current.getDate() + 1);
  }

  for (const pkg of packages) {
    const created = pkg.createdAt?.toDate ? pkg.createdAt.toDate() : new Date(pkg.createdAt);
    const createdKey = created.toISOString().slice(0, 10);
    if (days[createdKey]) days[createdKey].created++;

    if (pkg.actualDeliveryAt) {
      const delivered = pkg.actualDeliveryAt.toDate ? pkg.actualDeliveryAt.toDate() : new Date(pkg.actualDeliveryAt);
      const deliveredKey = delivered.toISOString().slice(0, 10);
      if (days[deliveredKey]) days[deliveredKey].delivered++;
    }
  }

  const labels = Object.keys(days).sort();
  return {
    labels,
    created: labels.map((d) => days[d].created),
    delivered: labels.map((d) => days[d].delivered),
    period: { start: start.toISOString(), end: end.toISOString() },
  };
}

/**
 * Generate CSV export.
 */
export async function generateCSV(period, startDate, endDate) {
  const { start, end } = getDateRange(period, startDate, endDate);
  const packagesRef = db.collection(COLLECTIONS.PACKAGES);
  const snap = await packagesRef.limit(1000).get();
  const packages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Filter by date range
  const filtered = packages.filter((pkg) => {
    const created = pkg.createdAt?.toDate ? pkg.createdAt.toDate() : new Date(pkg.createdAt);
    return created >= start && created <= end;
  });

  const headers = [
    'Package Reference',
    'Public Reference',
    'Project',
    'Current Stage',
    'Status',
    'Priority',
    'Expected Delivery',
    'Actual Delivery',
    'Confirmation Started',
    'Confirmation Completed',
    'Confirmation Delay Reason',
    'Packaging Started',
    'Packaging Completed',
    'Packaging Delay Reason',
    'Documentation Started',
    'Documentation Completed',
    'Documentation Delay Reason',
    'Delivery Started',
    'Delivery Completed',
    'Delivery Delay Reason',
    'Created At',
  ];

  const rows = filtered.map((pkg) => [
    csvSafe(pkg.packageCode),
    csvSafe(pkg.publicReference),
    csvSafe(pkg.projectName),
    csvSafe(pkg.currentStage),
    csvSafe(pkg.status),
    csvSafe(pkg.priority),
    csvSafe(toISO(pkg.expectedDeliveryAt)),
    csvSafe(toISO(pkg.actualDeliveryAt)),
    csvSafe(toISO(pkg.confirmation?.startedAt)),
    csvSafe(toISO(pkg.confirmation?.completedAt)),
    csvSafe(pkg.confirmation?.delayReason),
    csvSafe(toISO(pkg.packaging?.startedAt)),
    csvSafe(toISO(pkg.packaging?.completedAt)),
    csvSafe(pkg.packaging?.delayReason),
    csvSafe(toISO(pkg.documentation?.startedAt)),
    csvSafe(toISO(pkg.documentation?.completedAt)),
    csvSafe(pkg.documentation?.delayReason),
    csvSafe(toISO(pkg.delivery?.startedAt)),
    csvSafe(toISO(pkg.delivery?.completedAt)),
    csvSafe(pkg.delivery?.delayReason),
    csvSafe(toISO(pkg.createdAt)),
  ]);

  const timestamp = new Date().toISOString();
  const csv = [
    `# Blindspot Report — Generated: ${timestamp}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  return csv;
}

export default {
  getSummaryReport,
  getDelayDistribution,
  getWeeklyComparison,
  getMonthlyComparison,
  getTrends,
  generateCSV,
};
