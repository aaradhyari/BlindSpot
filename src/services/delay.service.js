/**
 * Blindspot — Delay detection service
 * Core engine: calculates delay status, durations, and aggregates.
 */
import { db } from '../config/firebase.js';
import { COLLECTIONS, STAGES, STATUS, STAGE_ORDER, DELAY_LABELS, DEFAULT_STAGE_DURATIONS } from '../constants/index.js';
import { toISO, durationMinutes } from '../utils/index.js';

/**
 * Get delay status for a specific stage of a package.
 */
export function getStageDelayStatus(stageData, now = new Date()) {
  if (!stageData) return { label: DELAY_LABELS.NO_DEADLINE, delayMinutes: 0 };

  const status = stageData.status;
  const deadline = stageData.deadline
    ? (stageData.deadline.toDate ? stageData.deadline.toDate() : new Date(stageData.deadline))
    : null;

  const completedAt = stageData.completedAt
    ? (stageData.completedAt.toDate ? stageData.completedAt.toDate() : new Date(stageData.completedAt))
    : null;

  const startedAt = stageData.startedAt
    ? (stageData.startedAt.toDate ? stageData.startedAt.toDate() : new Date(stageData.startedAt))
    : null;

  // No deadline configured
  if (!deadline) {
    if (status === STATUS.COMPLETED) {
      return { label: DELAY_LABELS.COMPLETED_ON_TIME, delayMinutes: 0 };
    }
    return { label: DELAY_LABELS.NO_DEADLINE, delayMinutes: 0 };
  }

  // Stage completed
  if (status === STATUS.COMPLETED && completedAt) {
    if (completedAt <= deadline) {
      return { label: DELAY_LABELS.COMPLETED_ON_TIME, delayMinutes: 0 };
    }
    const delayMs = completedAt - deadline;
    return {
      label: DELAY_LABELS.COMPLETED_LATE,
      delayMinutes: Math.round(delayMs / 60000),
    };
  }

  // Stage not completed — check if overdue
  if (now > deadline) {
    const overdueMs = now - deadline;
    return {
      label: DELAY_LABELS.DELAYED,
      delayMinutes: Math.round(overdueMs / 60000),
    };
  }

  // Check warning threshold (default 6 hours)
  const warningMs = 6 * 60 * 60 * 1000;
  if (deadline - now < warningMs) {
    return {
      label: DELAY_LABELS.DUE_SOON,
      delayMinutes: 0,
      remainingMinutes: Math.round((deadline - now) / 60000),
    };
  }

  return { label: DELAY_LABELS.ON_TRACK, delayMinutes: 0 };
}

/**
 * Get full delay analysis for a package.
 */
export function analyzePackageDelays(pkg) {
  const now = new Date();
  const analysis = {};

  for (const stage of STAGE_ORDER) {
    const key = stage.toLowerCase();
    const stageData = pkg[key];
    analysis[stage] = getStageDelayStatus(stageData, now);

    // Add stage duration
    if (stageData?.startedAt && stageData?.completedAt) {
      const started = stageData.startedAt.toDate ? stageData.startedAt.toDate() : new Date(stageData.startedAt);
      const completed = stageData.completedAt.toDate ? stageData.completedAt.toDate() : new Date(stageData.completedAt);
      analysis[stage].actualDurationMinutes = Math.round((completed - started) / 60000);
    } else if (stageData?.startedAt) {
      const started = stageData.startedAt.toDate ? stageData.startedAt.toDate() : new Date(stageData.startedAt);
      analysis[stage].elapsedMinutes = Math.round((now - started) / 60000);
    }

    // Include delay reason if recorded
    if (stageData?.delayReason) {
      analysis[stage].delayReason = stageData.delayReason;
      analysis[stage].delayExplanation = stageData.delayExplanation || '';
    }
  }

  return analysis;
}

/**
 * Aggregate delay statistics across all packages within a date range.
 */
export async function getDelayStatistics(startDate, endDate) {
  const packagesRef = db.collection(COLLECTIONS.PACKAGES);
  const snap = await packagesRef.limit(1000).get();
  const packages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Filter by date range if provided
  const filtered = packages.filter((pkg) => {
    if (!startDate) return true;
    const created = pkg.createdAt?.toDate ? pkg.createdAt.toDate() : new Date(pkg.createdAt);
    return created >= startDate && created <= endDate;
  });

  const stats = {
    totalPackages: filtered.length,
    completedPackages: 0,
    overduePackages: 0,
    onTimeDeliveryRate: 0,
    stageStats: {},
    delayReasons: {},
    topDelayReasons: [],
  };

  const now = new Date();

  // Per-stage aggregation
  for (const stage of STAGE_ORDER) {
    stats.stageStats[stage] = {
      total: 0,
      completed: 0,
      delayed: 0,
      completedOnTime: 0,
      completedLate: 0,
      totalDurationMinutes: 0,
      totalDelayMinutes: 0,
      avgDurationMinutes: 0,
      avgDelayMinutes: 0,
      delayRate: 0,
    };
  }

  for (const pkg of filtered) {
    if (pkg.status === STATUS.DELIVERED) stats.completedPackages++;

    // Check overall overdue
    if (pkg.expectedDeliveryAt && pkg.status !== STATUS.DELIVERED) {
      const exp = pkg.expectedDeliveryAt.toDate ? pkg.expectedDeliveryAt.toDate() : new Date(pkg.expectedDeliveryAt);
      if (now > exp) stats.overduePackages++;
    }

    // Analyze each stage
    for (const stage of STAGE_ORDER) {
      const key = stage.toLowerCase();
      const stageData = pkg[key];
      if (!stageData) continue;

      const st = stats.stageStats[stage];

      // Count if this stage has been touched
      if (stageData.status !== STATUS.PENDING) {
        st.total++;
      }

      if (stageData.status === STATUS.COMPLETED) {
        st.completed++;

        // Duration
        if (stageData.startedAt && stageData.completedAt) {
          const started = stageData.startedAt.toDate ? stageData.startedAt.toDate() : new Date(stageData.startedAt);
          const completed = stageData.completedAt.toDate ? stageData.completedAt.toDate() : new Date(stageData.completedAt);
          st.totalDurationMinutes += Math.round((completed - started) / 60000);
        }

        // Check if completed late
        if (stageData.deadline) {
          const deadline = stageData.deadline.toDate ? stageData.deadline.toDate() : new Date(stageData.deadline);
          const completed = stageData.completedAt?.toDate ? stageData.completedAt.toDate() : new Date(stageData.completedAt);
          if (completed > deadline) {
            st.completedLate++;
            st.totalDelayMinutes += Math.round((completed - deadline) / 60000);
          } else {
            st.completedOnTime++;
          }
        } else {
          st.completedOnTime++; // No deadline = on time
        }
      }

      if (stageData.status === STATUS.DELAYED) {
        st.delayed++;
      }

      // Delay reasons
      if (stageData.delayReason) {
        const reasonKey = `${stage}:${stageData.delayReason}`;
        stats.delayReasons[reasonKey] = (stats.delayReasons[reasonKey] || 0) + 1;
      }
    }
  }

  // Calculate averages and rates
  for (const stage of STAGE_ORDER) {
    const st = stats.stageStats[stage];
    if (st.completed > 0) {
      st.avgDurationMinutes = Math.round(st.totalDurationMinutes / st.completed);
    }
    const lateTotal = st.completedLate + st.delayed;
    if (lateTotal > 0 && st.total > 0) {
      st.avgDelayMinutes = Math.round(st.totalDelayMinutes / lateTotal) || 0;
      st.delayRate = Math.round((lateTotal / st.total) * 100);
    }
  }

  // On-time delivery rate
  if (stats.completedPackages > 0) {
    const onTimeDeliveries = filtered.filter((pkg) => {
      if (pkg.status !== STATUS.DELIVERED) return false;
      if (!pkg.expectedDeliveryAt || !pkg.actualDeliveryAt) return true; // No deadline = on time
      const exp = pkg.expectedDeliveryAt.toDate ? pkg.expectedDeliveryAt.toDate() : new Date(pkg.expectedDeliveryAt);
      const act = pkg.actualDeliveryAt.toDate ? pkg.actualDeliveryAt.toDate() : new Date(pkg.actualDeliveryAt);
      return act <= exp;
    }).length;
    stats.onTimeDeliveryRate = Math.round((onTimeDeliveries / stats.completedPackages) * 100);
  }

  // Top delay reasons
  stats.topDelayReasons = Object.entries(stats.delayReasons)
    .map(([key, count]) => {
      const [stage, reason] = key.split(':');
      return { stage, reason, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
}

export default {
  getStageDelayStatus,
  analyzePackageDelays,
  getDelayStatistics,
};
