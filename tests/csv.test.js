import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import {parseDelimited,parseBdgestCsv,toIsoDate} from '../src/csv.js';
test('parse delimiter quoted',()=>assert.deepEqual(parseDelimited('a;b\n"x;y";z\n'),[['a','b'],['x;y','z']]));
test('parse BDGest real export',()=>{const rows=parseBdgestCsv(fs.readFileSync(new URL('./fixtures/bdgest-sample.csv',import.meta.url),'utf8'));assert.equal(rows.length,4);assert.equal(rows.filter(x=>x.isbn).length,3);assert.equal(rows.filter(x=>x.firstEdition).length,2);assert.equal(rows.filter(x=>x.read).length,2);assert.equal(rows[0].title,'Premier')});
test('dates FR vers ISO',()=>{assert.equal(toIsoDate('14/06/2023'),'2023-06-14');assert.equal(toIsoDate(''),null)});
