import fs from 'node:fs';
import path from 'node:path';
import {parseBdgestCsv,toIsoDate} from '../src/csv.js';
import {openDatabase,importBdgest,dashboard,editionAnomalies} from '../src/db.js';

const input=process.argv[2]||process.env.BDGEST_VALIDATION_CSV;
if(!input||!fs.existsSync(input)){console.error('Usage: node scripts/validate-bdgest.js /chemin/export-bdgest.csv');process.exit(2)}
const csv=fs.readFileSync(input,'utf8'), expected=parseBdgestCsv(csv), db=openDatabase(':memory:'), imported=importBdgest(db,csv);
const map=[
  ['bdgestId','bdgest_id',v=>v],['isbn','isbn',v=>v],['series','series',v=>v],['number','number',v=>v],['numberAlt','number_alt',v=>v],['title','title',v=>v],['publisher','publisher',v=>v],['collection','collection_name',v=>v],['firstEdition','first_edition',v=>v],['legalDeposit','legal_deposit',v=>v],['printDate','print_date',v=>v],['marketValue','market_value',v=>v],['condition','condition',v=>v],['purchaseDate','purchase_date',v=>toIsoDate(v)||v],['purchasePrice','purchase_price',v=>v],['note','note',v=>v],['writer','writer',v=>v],['artist','artist',v=>v],['wishlist','wishlist',v=>v],['forSale','for_sale',v=>v],['format','format',v=>v],['followed','followed',v=>v],['read','read',v=>v],['readDate','read_date',v=>toIsoDate(v)||v],['signed','signed',v=>v],['signedDate','signed_date',v=>toIsoDate(v)||v],['comment','comment',v=>v],['tableName','table_name',v=>v],['source','source',v=>v]
];
let checks=0,matches=0;const mismatch=[];
for(const e of expected){const a=db.prepare('SELECT * FROM albums WHERE bdgest_id=?').get(e.bdgestId);if(!a){mismatch.push({bdgestId:e.bdgestId,field:'record',expected:'present',actual:'missing'});continue}for(const [ek,ak,transform] of map){checks++;const ev=transform(e[ek]);const av=a[ak];const same=(ev==null&&av==null)||String(ev??'')===String(av??'');if(same)matches++;else if(mismatch.length<30)mismatch.push({bdgestId:e.bdgestId,field:ak,expected:ev,actual:av})}}
const dash=dashboard(db), anomalies=editionAnomalies(db), score=checks?Math.round(matches/checks*10000)/100:0;
const report={file:path.basename(input),sourceRows:expected.length,imported:imported.imported,skipped:imported.skipped,albumsInDb:dash.albums,series:dash.series,isbnPresent:expected.filter(x=>x.isbn).length,firstEditions:dash.eo,read:dash.read,duplicateIsbnGroups:anomalies.duplicateIsbns.length,fieldChecks:checks,fieldMatches:matches,scorePercent:score,mismatches:mismatch};
console.log(JSON.stringify(report,null,2));
if(process.env.BDGEST_VALIDATION_MD){const md=`# Validation import BDGest\n\n- Albums source : **${report.sourceRows}**\n- Albums importés : **${report.imported}**\n- Rejets : **${report.skipped}**\n- Séries : **${report.series}**\n- ISBN renseignés : **${report.isbnPresent}**\n- Éditions originales marquées : **${report.firstEditions}**\n- Albums lus : **${report.read}**\n- Groupes d'ISBN dupliqués : **${report.duplicateIsbnGroups}**\n- Contrôles champ par champ : **${report.fieldChecks}**\n- Correspondances : **${report.fieldMatches}**\n- Score de fidélité : **${report.scorePercent} %**\n\n${report.mismatches.length?'## Écarts\n```json\n'+JSON.stringify(report.mismatches,null,2)+'\n```':'Aucun écart détecté sur les champs mappés.'}\n`;fs.writeFileSync(process.env.BDGEST_VALIDATION_MD,md)}
if(score<99||imported.skipped>0||dash.albums!==expected.length)process.exitCode=1;
