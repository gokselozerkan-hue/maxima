const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

let db = null;

async function initDB() {
  if (!DATABASE_URL) { console.log('Dosya sistemi kullanılıyor.'); return false; }
  try {
    const { Client } = require('pg');
    db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await db.connect();
    await db.query(`CREATE TABLE IF NOT EXISTS maxima_data (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
    console.log('PostgreSQL bağlantısı başarılı');
    return true;
  } catch (e) { console.error('DB hatası:', e.message); db = null; return false; }
}

const DEFAULTS = {
  cases:'[]',events:'[]',todos:'[]',calls:'[]',chat:'[]',logs:'[]',
  users:'["Av. Göksel Özerkan","Av. Berker Ünal","Av. Fatmanur Şenocak","Av. Aslıhan Bilgin","Mine Yılmazoğlu"]',
  settings:'{"theme":"dark","alarmDays":3}',
};

async function readData(key) {
  if (db) {
    try {
      const r = await db.query('SELECT value FROM maxima_data WHERE key=$1',[key]);
      if (r.rows.length) return JSON.parse(r.rows[0].value);
    } catch(e) { console.error('read error:',e.message); }
  }
  const fp = path.join(__dirname,'data',key+'.json');
  try { if(fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp,'utf8')); } catch(e) {}
  return JSON.parse(DEFAULTS[key]||'[]');
}

async function writeData(key, data) {
  const val = JSON.stringify(data);
  if (db) {
    try {
      await db.query(
        `INSERT INTO maxima_data(key,value,updated_at) VALUES($1,$2,NOW())
         ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()`,
        [key,val]
      );
      return;
    } catch(e) { console.error('write error:',e.message); }
  }
  const dir = path.join(__dirname,'data');
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,key+'.json'),val);
}

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json',
  '.png':'image/png',
};

function parseBody(req) {
  return new Promise(resolve => {
    let b=''; req.on('data',c=>b+=c);
    req.on('end',()=>{ try{resolve(JSON.parse(b))}catch{resolve({})} });
  });
}

function json(res,data,status=200) {
  res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(data));
}

function serveFile(res,fp) {
  fs.readFile(fp,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'text/plain'});
    res.end(data);
  });
}

const server = http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}

  const parsed = url.parse(req.url,true);
  const pathname = parsed.pathname;
  const method = req.method;

  if(pathname==='/'||pathname==='/index.html')
    return serveFile(res,path.join(__dirname,'index.html'));

  if(pathname.startsWith('/api/')) {
    const parts = pathname.split('/').filter(Boolean);
    const resource = parts[1];
    const id = parts[2];

    if(pathname==='/api/backup'&&method==='GET') {
      const backup={version:2,exportedAt:new Date().toISOString()};
      for(const k of ['cases','events','todos','calls','chat','users','logs','settings'])
        backup[k]=await readData(k);
      res.writeHead(200,{'Content-Type':'application/json',
        'Content-Disposition':`attachment; filename="Maxima_Yedek_${new Date().toISOString().slice(0,10)}.json"`});
      return res.end(JSON.stringify(backup,null,2));
    }

    if(pathname==='/api/restore'&&method==='POST') {
      const body=await parseBody(req);
      if(!body.cases) return json(res,{error:'Geçersiz yedek'},400);
      for(const k of ['cases','events','todos','calls','chat','users','logs','settings'])
        if(body[k]!==undefined) await writeData(k,body[k]);
      return json(res,{ok:true});
    }

    if(resource==='users') {
      if(method==='GET') return json(res,await readData('users'));
      if(method==='PUT'){const b=await parseBody(req);if(Array.isArray(b)){await writeData('users',b);return json(res,{ok:true});}}
    }

    if(resource==='settings') {
      if(method==='GET') return json(res,await readData('settings'));
      if(method==='POST'){const b=await parseBody(req);await writeData('settings',b);return json(res,{ok:true});}
    }

    const RESOURCES=['cases','events','todos','calls','chat','logs'];
    if(RESOURCES.includes(resource)) {
      if(method==='GET') return json(res,await readData(resource));
      if(method==='POST') {
        const body=await parseBody(req);
        const data=await readData(resource);
        const item={...body,id:body.id||Date.now().toString()+Math.random().toString(36).slice(2)};
        data.push(item);
        await writeData(resource,data);
        return json(res,item);
      }
      if(method==='PUT') {
        const body=await parseBody(req);
        if(!id){if(Array.isArray(body)){await writeData(resource,body);return json(res,{ok:true});}}
        else {
          const data=await readData(resource);
          const idx=data.findIndex(x=>x.id===id);
          if(idx!==-1){data[idx]={...data[idx],...body,id};await writeData(resource,data);}
          return json(res,{ok:true});
        }
      }
      if(method==='DELETE'&&id) {
        let data=await readData(resource);
        const item=data.find(x=>x.id===id);
        data=data.filter(x=>x.id!==id);
        if(resource==='cases'){
          let events=await readData('events');
          events=events.filter(e=>e.caseId!==id||!e.auto);
          await writeData('events',events);
        }
        await writeData(resource,data);
        return json(res,{ok:true});
      }
    }
    // Excel export
    if(pathname === '/api/export-excel' && method === 'POST') {
      const body = await parseBody(req);
      const casesData = body.cases || [];
      try {
        const XLSX = require('xlsx');
        const statusLbl = {
          arabulucu:'Arabulucuya Başvurulacak', davaacilacak:'Dava Açılacak',
          active:'İlk Derece', bam:'BAM', infaz:'İnfaz', urgent:'Acil', closed:'Kapalı'
        };
        const fmtDate = d => {
          if(!d || d.length < 10) return '';
          return d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4);
        };
        const headers = [
          'BÜRO NO','DURUMU','MÜVEKKİL ADI SOYADI','MÜVEKKİL TELEFONU',
          'KARŞI TARAF','DAVA TÜRÜ','MAHKEME ADI','ESAS NO',
          'ARABULUCULUĞA BAŞVURU TARİHİ','DAVA AÇILACAK TARİH',
          'ZAMANAŞIMI TARİHİ','GENEL NOT','KEŞİF/YERİNDE İNCELEME TARİHİ',
          'ISLAH SON GÜN','İSTİNAF SON GÜN','İCRA DAİRESİ','İCRA ESAS NO','İCRA NOTLARI'
        ];
        const rows = casesData.map(c => [
          c.buro||'', statusLbl[c.status]||c.status||'', c.muv||'', c.tel||'',
          c.karsitaraf||'', c.tur||'', c.mahkeme||'', c.esas||'',
          fmtDate(c.arabulucu), fmtDate(c.davaAc), fmtDate(c.zamanasimi),
          c.not||'', fmtDate(c.kesifTarih), fmtDate(c.islahTarih),
          fmtDate(c.istinafTarih), c.icraDaire||'', c.icraEsas||'', c.icraNot||''
        ]);
        const wb = XLSX.utils.book_new();
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        // Sütun genişlikleri
        ws['!cols'] = [13,18,14,13,13,13,12,10,17,13,13,20,15,13,13,13,13,20].map(w=>({wch:w}));
        // Başlık stili
        const range = XLSX.utils.decode_range(ws['!ref']);
        for(let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({r:0, c:C});
          if(!ws[addr]) ws[addr] = {v:'',t:'s'};
          ws[addr].s = {
            font: {bold:true, color:{rgb:'FFFFFF'}, sz:11, name:'Calibri'},
            fill: {patternType:'solid', fgColor:{rgb:'757171'}},
            alignment: {horizontal:'center', vertical:'center', wrapText:true},
            border: {top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}
          };
        }
        XLSX.utils.book_append_sheet(wb, ws, 'Dava Raporu');
        const buf = XLSX.write(wb, {type:'buffer', bookType:'xlsx', cellStyles:true});
        const today = new Date().toLocaleDateString('tr-TR').replace(/\./g,'-');
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Maxima_Dava_Raporu_${today}.xlsx"`,
          'Content-Length': buf.length
        });
        return res.end(buf);
      } catch(err) {
        console.error('Excel error:', err.message);
        res.writeHead(500); res.end('Excel hatası: ' + err.message);
        return;
      }
    }

        res.writeHead(404);res.end('API not found');
    return;
  }
