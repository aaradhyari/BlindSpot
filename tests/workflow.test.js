/**
 * Blindspot — Workflow Validation and Stage Transition Tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPackageSchema,
  documentationSchema,
  completeDeliverySchema,
  recordDelaySchema,
} from '../src/validators/index.js';
import { STAGE_ORDER, STAGES } from '../src/constants/index.js';

test('Workflow — STAGE_ORDER sequence is strictly sequential', () => {
  assert.deepEqual(STAGE_ORDER, [
    STAGES.CONFIRMATION,
    STAGES.PACKAGING,
    STAGES.DOCUMENTATION,
    STAGES.DELIVERY,
  ]);
});

test('Workflow — createPackageSchema validates required fields', () => {
  const validData = {
    packageCode: 'BLIND-2026-0001',
    projectName: 'Acme Project Alpha',
    customerName: 'Acme Corp',
    priority: 'HIGH',
  };

  const parsed = createPackageSchema.safeParse(validData);
  assert.equal(parsed.success, true);
});

test('Workflow — createPackageSchema rejects missing packageCode or customerName', () => {
  const missingCode = {
    projectName: 'Project Beta',
    customerName: 'Customer Inc',
  };
  assert.equal(createPackageSchema.safeParse(missingCode).success, false);

  const missingCustomer = {
    packageCode: 'BLIND-2026-0002',
    projectName: 'Project Beta',
  };
  assert.equal(createPackageSchema.safeParse(missingCustomer).success, false);
});

test('Workflow — recordDelaySchema requires reason', () => {
  const validDelay = {
    reason: 'MATERIAL_SHORTAGE',
    explanation: 'Component supplier delayed dispatch of memory chips',
  };
  assert.equal(recordDelaySchema.safeParse(validDelay).success, true);

  const emptyReason = {
    reason: '   ',
    explanation: 'Some explanation',
  };
  assert.equal(recordDelaySchema.safeParse(emptyReason).success, false);
});

test('Workflow — documentationSchema validates optional references and remarks', () => {
  const validDoc = {
    invoiceReference: 'INV-9901',
    shippingDocReference: 'EWB-2026-4412',
    remarks: 'Clearance verified',
  };
  const parsed = documentationSchema.safeParse(validDoc);
  assert.equal(parsed.success, true);
});

test('Workflow — completeDeliverySchema parses valid delivery completion', () => {
  const validDelivery = {
    remarks: 'Delivered to loading dock 4',
    proofOfDelivery: 'Signed by Warehouse Manager R. Roy',
  };
  assert.equal(completeDeliverySchema.safeParse(validDelivery).success, true);
});
