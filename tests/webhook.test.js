import test from 'node:test';
import assert from 'node:assert/strict';
import { signPayload, verifySignature } from '../services/signature.js';
test('signature roundtrip', ()=>{ const body='{}'; const s=signPayload(body,'x'); assert.ok(verifySignature(body,s,'x')); });
