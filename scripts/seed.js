import fs from 'node:fs';
import {configFromEnv} from '../src/config.js';
import {openDatabase,importBdgest} from '../src/db.js';
const c=configFromEnv();
if(!c.seedCsvPath||!fs.existsSync(c.seedCsvPath)){console.error('BD_DESK_SEED_CSV doit pointer vers un export BDGest existant');process.exit(2)}
const db=openDatabase(c.dbPath);db.exec('DELETE FROM albums');console.log(importBdgest(db,fs.readFileSync(c.seedCsvPath,'utf8')));
