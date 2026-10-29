/**
 * Blindspot — Permissions & RBAC Tests
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize, authorizeStage } from '../src/middleware/authorize.js';
import { ROLES, STAGES } from '../src/constants/index.js';

function createMockReqRes(employee) {
  const req = { employee };
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next, wasNextCalled: () => nextCalled };
}

test('Permissions — Unauthenticated request is rejected with 401', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes(null);
  const middleware = authorize(ROLES.ADMIN);

  middleware(req, res, next);

  assert.equal(res.statusCode, 401);
  assert.equal(wasNextCalled(), false);
});

test('Permissions — ADMIN allowed on ADMIN-only route', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes({ role: ROLES.ADMIN });
  const middleware = authorize(ROLES.ADMIN);

  middleware(req, res, next);

  assert.equal(wasNextCalled(), true);
  assert.equal(res.statusCode, null);
});

test('Permissions — CONFIRM role rejected on ADMIN-only route with 403', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes({ role: ROLES.CONFIRM });
  const middleware = authorize(ROLES.ADMIN);

  middleware(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(wasNextCalled(), false);
});

test('Permissions — authorizeStage permits role assigned to that stage', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes({ role: ROLES.CONFIRM });
  const middleware = authorizeStage(STAGES.CONFIRMATION);

  middleware(req, res, next);

  assert.equal(wasNextCalled(), true);
  assert.equal(res.statusCode, null);
});

test('Permissions — authorizeStage permits ADMIN on any stage', () => {
  const stages = [STAGES.CONFIRMATION, STAGES.PACKAGING, STAGES.DOCUMENTATION, STAGES.DELIVERY];

  for (const st of stages) {
    const { req, res, next, wasNextCalled } = createMockReqRes({ role: ROLES.ADMIN });
    const middleware = authorizeStage(st);
    middleware(req, res, next);
    assert.equal(wasNextCalled(), true, `ADMIN should be authorized for ${st}`);
  }
});

test('Permissions — PACK role cannot operate on DELIVERY stage', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes({ role: ROLES.PACK });
  const middleware = authorizeStage(STAGES.DELIVERY);

  middleware(req, res, next);

  assert.equal(res.statusCode, 403);
  assert.equal(wasNextCalled(), false);
});
