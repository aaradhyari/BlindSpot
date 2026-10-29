/**
 * Blindspot — Authentication and Employee Account Validation Tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionSchema, createEmployeeSchema, updateRoleSchema } from '../src/validators/index.js';
import { ALL_ROLES, ROLES } from '../src/constants/index.js';

test('Auth — sessionSchema rejects invalid or empty ID tokens', () => {
  assert.equal(sessionSchema.safeParse({}).success, false);
  assert.equal(sessionSchema.safeParse({ idToken: 'short' }).success, false);

  // Valid length token (> 100 chars)
  const dummyJwt = 'a'.repeat(120);
  assert.equal(sessionSchema.safeParse({ idToken: dummyJwt }).success, true);
});

test('Auth — createEmployeeSchema enforces strong password policy', () => {
  const shortPass = {
    name: 'Operator Jane',
    email: 'jane@blindspot.local',
    password: '123', // < 8 characters
    role: ROLES.PACK,
  };
  const parsed = createEmployeeSchema.safeParse(shortPass);
  assert.equal(parsed.success, false);

  const validEmp = {
    name: 'Operator Jane',
    email: 'jane@blindspot.local',
    password: 'StrongPassword123!',
    role: ROLES.PACK,
  };
  assert.equal(createEmployeeSchema.safeParse(validEmp).success, true);
});

test('Auth — createEmployeeSchema enforces valid role from ALL_ROLES', () => {
  const invalidRole = {
    name: 'Operator Bob',
    email: 'bob@blindspot.local',
    password: 'StrongPassword123!',
    role: 'SUPERUSER_INVALID',
  };
  assert.equal(createEmployeeSchema.safeParse(invalidRole).success, false);

  for (const role of ALL_ROLES) {
    const valid = {
      name: 'Operator Test',
      email: 'test@blindspot.local',
      password: 'StrongPassword123!',
      role,
    };
    assert.equal(createEmployeeSchema.safeParse(valid).success, true);
  }
});

test('Auth — updateRoleSchema validates role enum strictly', () => {
  assert.equal(updateRoleSchema.safeParse({ role: ROLES.ADMIN }).success, true);
  assert.equal(updateRoleSchema.safeParse({ role: 'HACKER' }).success, false);
});
