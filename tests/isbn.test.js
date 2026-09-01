import test from 'node:test'; import assert from 'node:assert/strict';
import {normalizeIsbn,isValidIsbn10,isValidIsbn13,isbn10To13,canonicalIsbn,isbn13CheckDigit} from '../src/isbn.js';
test('normalise ISBN',()=>assert.equal(normalizeIsbn('978-2-344-05981-4'),'9782344059814'));
test('valide ISBN13',()=>{assert.equal(isValidIsbn13('9782203237766'),true);assert.equal(isValidIsbn13('9782203237767'),false)});
test('valide ISBN10 et convertit',()=>{assert.equal(isValidIsbn10('2-87097-043-9'),true);assert.equal(isbn10To13('2-87097-043-9'),'9782870970430')});
test('canonicalise',()=>{assert.equal(canonicalIsbn('2-87097-043-9'),'9782870970430');assert.equal(canonicalIsbn('foo'),null);assert.equal(canonicalIsbn(''),null)});
test('check digit invalid input',()=>assert.equal(isbn13CheckDigit('123'),null));
