/**
 * Blindspot — Delay Engine Tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { getStageDelayStatus, analyzePackageDelays } from '../src/services/delay.service.js';
import { DELAY_LABELS, STATUS } from '../src/constants/index.js';

test('Delay Engine — Stage without deadline returns NO_DEADLINE', () => {
  const stageData = {
    status: STATUS.PENDING,
    deadline: null,
  };
  const status = getStageDelayStatus(stageData);
  assert.equal(status.label, DELAY_LABELS.NO_DEADLINE);
  assert.equal(status.delayMinutes, 0);
});

test('Delay Engine — Completed before deadline returns COMPLETED_ON_TIME', () => {
  const now = new Date();
  const deadline = new Date(now.getTime() + 3600000); // 1 hour in future
  const completedAt = new Date(now.getTime() - 1800000); // 30 mins ago

  const stageData = {
    status: STATUS.COMPLETED,
    deadline,
    completedAt,
  };

  const status = getStageDelayStatus(stageData);
  assert.equal(status.label, DELAY_LABELS.COMPLETED_ON_TIME);
  assert.equal(status.delayMinutes, 0);
});

test('Delay Engine — Completed after deadline returns COMPLETED_LATE with accurate delayMinutes', () => {
  const deadline = new Date('2026-10-29T10:00:00Z');
  const completedAt = new Date('2026-10-29T12:30:00Z'); // 150 minutes late

  const stageData = {
    status: STATUS.COMPLETED,
    deadline,
    completedAt,
  };

  const status = getStageDelayStatus(stageData);
  assert.equal(status.label, DELAY_LABELS.COMPLETED_LATE);
  assert.equal(status.delayMinutes, 150);
});

test('Delay Engine — In-progress stage past deadline returns DELAYED with overdue minutes', () => {
  const now = new Date('2026-10-29T15:00:00Z');
  const deadline = new Date('2026-10-29T13:00:00Z'); // 120 minutes overdue

  const stageData = {
    status: STATUS.IN_PROGRESS,
    deadline,
  };

  const status = getStageDelayStatus(stageData, now);
  assert.equal(status.label, DELAY_LABELS.DELAYED);
  assert.equal(status.delayMinutes, 120);
});

test('Delay Engine — In-progress stage approaching deadline within 6 hours returns DUE_SOON', () => {
  const now = new Date('2026-10-29T12:00:00Z');
  const deadline = new Date('2026-10-29T15:00:00Z'); // 3 hours (180 mins) remaining

  const stageData = {
    status: STATUS.IN_PROGRESS,
    deadline,
  };

  const status = getStageDelayStatus(stageData, now);
  assert.equal(status.label, DELAY_LABELS.DUE_SOON);
  assert.equal(status.remainingMinutes, 180);
});

test('Delay Engine — analyzePackageDelays produces complete lifecycle breakdown', () => {
  const now = new Date();
  const pkg = {
    confirmation: {
      status: STATUS.COMPLETED,
      startedAt: new Date(now.getTime() - 7200000),
      completedAt: new Date(now.getTime() - 3600000),
      deadline: new Date(now.getTime() - 1800000),
    },
    packaging: {
      status: STATUS.IN_PROGRESS,
      startedAt: new Date(now.getTime() - 3600000),
      deadline: new Date(now.getTime() + 7200000),
    },
    documentation: { status: STATUS.PENDING },
    delivery: { status: STATUS.PENDING },
  };

  const analysis = analyzePackageDelays(pkg);

  assert.ok(analysis.CONFIRMATION);
  assert.equal(analysis.CONFIRMATION.label, DELAY_LABELS.COMPLETED_ON_TIME);
  assert.equal(analysis.CONFIRMATION.actualDurationMinutes, 60);

  assert.ok(analysis.PACKAGING);
  assert.ok(analysis.DOCUMENTATION);
  assert.ok(analysis.DELIVERY);
});
