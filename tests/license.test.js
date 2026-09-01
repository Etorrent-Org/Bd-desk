import test from 'node:test'; import assert from 'node:assert/strict';
import {createLicense,verifyLicense,hasFeature} from '../src/license.js';
const secret='a-very-secret-value';
test('licence premium signée',()=>{const k=createLicense({sub:'Erwann'},secret);const l=verifyLicense(k,secret);assert.equal(l.valid,true);assert.equal(l.plan,'premium');assert.equal(hasFeature(l,'mcp'),true)});
test('signature invalide rejetée',()=>{const k=createLicense({},secret)+'x';assert.equal(verifyLicense(k,secret).valid,false)});
test('expiration',()=>{const k=createLicense({expiresAt:'2025-01-01T00:00:00Z'},secret);const l=verifyLicense(k,secret,new Date('2026-01-01T00:00:00Z'));assert.equal(l.reason,'expired')});
test('clé absente',()=>assert.equal(verifyLicense('',secret).reason,'missing'));
