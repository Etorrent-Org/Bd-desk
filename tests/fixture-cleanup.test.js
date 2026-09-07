import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, migrate } from '../src/db.js';

test('la migration supprime uniquement la ligne synthétique BDGest qui a fui en production',()=>{
  const db=openDatabase(':memory:');
  db.prepare("DELETE FROM settings WHERE key='cleanup-synthetic-bdgest-fixture-v1'").run();
  db.prepare(`INSERT INTO albums(bdgest_id,isbn,series,title,publisher,writer,artist) VALUES(?,?,?,?,?,?,?)`).run('4',null,'One shot','Sans ISBN','Editeur C','Auteur C','Dessinateur C');
  db.prepare(`INSERT INTO albums(bdgest_id,isbn,series,title,publisher,writer,artist) VALUES(?,?,?,?,?,?,?)`).run('real-4',null,'One shot','Un vrai album','Editeur C','Auteur C','Dessinateur C');
  migrate(db);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM albums WHERE title='Sans ISBN' AND publisher='Editeur C'").get().c,0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM albums WHERE title='Un vrai album'").get().c,1);
});
