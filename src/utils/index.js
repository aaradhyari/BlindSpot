/**
 * Blindspot — Utility helpers
 */
import { admin } from '../config/firebase.js';

/** Get a Firestore server timestamp */
export function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

/** Convert a Firestore Timestamp to ISO string, or return null */
export function toISO(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  return ts;
}

/** Parse an ISO date string to a JS Date */
export function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Calculate duration in minutes between two dates */
export function durationMinutes(start, end) {
  if (!start || !end) return null;
  const s = start.toDate ? start.toDate() : new Date(start);
  const e = end.toDate ? end.toDate() : new Date(end);
  return Math.round((e - s) / 60000);
}

/** Calculate progress percentage based on current stage */
export function calculateProgress(currentStage, status) {
  if (status === 'DELIVERED') return 100;
  const stageProgress = {
    CONFIRMATION: 10,
    PACKAGING: 35,
    DOCUMENTATION: 60,
    DELIVERY: 80,
  };
  return stageProgress[currentStage] || 0;
}

/** Sanitize a string for safe CSV output — prevent formula injection */
export function csvSafe(value) {
  if (value == null) return '';
  let str = String(value);
  // Prevent CSV injection — prefix formula-trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape quotes and wrap in quotes if needed
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Generate a public reference like "BS-20241029-A3K9" */
export function generatePublicReference() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `BS-${dateStr}-${suffix}`;
}

/**
 * Get date boundaries for report periods.
 * Week starts on Monday by default.
 */
export function getDateRange(period, startDate, endDate, weekStart = 'monday') {
  const now = new Date();
  let start, end;

  switch (period) {
    case 'this_week': {
      start = getWeekStart(now, weekStart);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      break;
    }
    case 'last_week': {
      const thisWeekStart = getWeekStart(now, weekStart);
      start = new Date(thisWeekStart);
      start.setDate(start.getDate() - 7);
      end = thisWeekStart;
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    }
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'custom': {
      start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = endDate ? new Date(endDate) : now;
      break;
    }
    default: {
      start = getWeekStart(now, weekStart);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    }
  }

  return { start, end };
}

function getWeekStart(date, weekStart) {
  const d = new Date(date);
  const day = d.getDay();
  const offset = weekStart === 'monday'
    ? (day === 0 ? 6 : day - 1)
    : day;
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Paginate a Firestore query result */
export function paginateResults(items, page, limit) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return {
    data: paged,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
