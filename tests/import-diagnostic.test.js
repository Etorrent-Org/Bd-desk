import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const page = await readFile(join(root, 'public/import-test.html'), 'utf8');

test('la page de diagnostic reste un champ fichier natif autonome', () => {
  assert.match(page, /<input[^>]+type="file"/i);
  assert.match(page, /accept="\.csv,text\/csv,application\/vnd\.ms-excel"/i);
  assert.doesNotMatch(page, /\/app\.js|\/styles\.css|\/manifest\.webmanifest|input\.click\s*\(|showOpenFilePicker/i);
  assert.doesNotMatch(page, /display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0/i);
  assert.match(page, /Aucun fichier n’est envoyé ni enregistré/);
});
