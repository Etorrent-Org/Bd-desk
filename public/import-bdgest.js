export const isBdgestCsv=file=>Boolean(file)&&(/\.csv$/i.test(file.name||'')||file.type==='text/csv'||file.type==='application/vnd.ms-excel');

export const readBdgestFile=file=>{
  if(!file)return Promise.reject(new Error('Fichier CSV BDGest requis'));
  if(typeof file.text==='function')return file.text();
  if(typeof FileReader==='undefined')return Promise.reject(new Error('Lecture locale indisponible'));
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(new Error('Lecture du fichier impossible'));
    reader.readAsText(file,'UTF-8');
  });
};
