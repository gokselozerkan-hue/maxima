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
        const { execSync } = require('child_process');
        const os = require('os');
        const tmpFile = path.join(os.tmpdir(), 'maxima_export_' + Date.now() + '.xlsx');
        
        // Python scripti ile xlsx oluştur
        const script = `
import sys, json
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

cases = json.loads(sys.argv[1])
output = sys.argv[2]

status_lbl = {
  'arabulucu':'Arabulucuya Başvurulacak','davaacilacak':'Dava Açılacak',
  'active':'İlk Derece','bam':'BAM','infaz':'İnfaz','urgent':'Acil','closed':'Kapalı'
}

def fmt_date(d):
  if not d or len(d) < 10: return ''
  try: return d[8:10]+'.'+d[5:7]+'.'+d[0:4]
  except: return d

wb = Workbook()
ws = wb.active
ws.title = 'Dava Raporu'

headers = [
  'BÜRO NO','DURUMU','MÜVEKKİL ADI SOYADI','MÜVEKKİL TELEFONU',
  'KARŞI TARAF','DAVA TÜRÜ','MAHKEME ADI','ESAS NO',
  'ARABULUCULUĞA BAŞVURU TARİHİ','DAVA AÇILACAK TARİH',
  'ZAMANAŞIMI TARİHİ','GENEL NOT','KEŞİF/YERİNDE İNCELEME TARİHİ',
  'ISLAH SON GÜN','İSTİNAF SON GÜN','İCRA DAİRESİ','İCRA ESAS NO','İCRA NOTLARI'
]

col_widths = [13,18,14,13,13,13,12,10,17,13,13,20,15,13,13,13,13,20]

header_font = Font(bold=True, color='FFFFFF', size=11, name='Calibri')
header_fill = PatternFill('solid', fgColor='757171')
header_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
thin = Side(style='thin', color='000000')
header_border = Border(left=thin, right=thin, top=thin, bottom=thin)

data_font = Font(size=11, name='Calibri')
data_align = Alignment(horizontal='left', vertical='center', wrap_text=True)
thin_gray = Side(style='thin', color='D3D3D3')
data_border = Border(left=thin_gray, right=thin_gray, top=thin_gray, bottom=thin_gray)

ws.row_dimensions[1].height = 44

for i, h in enumerate(headers, 1):
  cell = ws.cell(row=1, column=i, value=h)
  cell.font = header_font
  cell.fill = header_fill
  cell.alignment = header_align
  cell.border = header_border
  ws.column_dimensions[get_column_letter(i)].width = col_widths[i-1]

for c in cases:
  row = [
    c.get('buro',''),
    status_lbl.get(c.get('status',''), c.get('status','')),
    c.get('muv',''),
    c.get('tel',''),
    c.get('karsitaraf',''),
    c.get('tur',''),
    c.get('mahkeme',''),
    c.get('esas',''),
    fmt_date(c.get('arabulucu','')),
    fmt_date(c.get('davaAc','')),
    fmt_date(c.get('zamanasimi','')),
    c.get('not',''),
    fmt_date(c.get('kesifTarih','')),
    fmt_date(c.get('islahTarih','')),
    fmt_date(c.get('istinafTarih','')),
    c.get('icraDaire',''),
    c.get('icraEsas',''),
    c.get('icraNot','')
  ]
  row_idx = ws.max_row + 1
  ws.row_dimensions[row_idx].height = 20
  for i, val in enumerate(row, 1):
    cell = ws.cell(row=row_idx, column=i, value=val)
    cell.font = data_font
    cell.alignment = data_align
    cell.border = data_border

wb.save(output)
print('OK')
`;
        
        const tmpScript = path.join(os.tmpdir(), 'make_excel.py');
        fs.writeFileSync(tmpScript, script);
        
        const casesJson = JSON.stringify(casesData).replace(/'/g, "\'");
        execSync(`python3 "${tmpScript}" '${casesJson}' "${tmpFile}"`, { timeout: 30000 });
        
        const xlsxData = fs.readFileSync(tmpFile);
        const today = new Date().toLocaleDateString('tr-TR').replace(/\./g,'-');
        
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Maxima_Dava_Raporu_${today}.xlsx"`,
          'Content-Length': xlsxData.length
        });
        res.end(xlsxData);
        
        // Temp dosyaları temizle
        try { fs.unlinkSync(tmpFile); fs.unlinkSync(tmpScript); } catch(e) {}
        return;
      } catch(err) {
        console.error('Excel export error:', err.message);
        res.writeHead(500); res.end('Excel oluşturulamadı: ' + err.message);
        return;
      }
    }

    res.writeHead(404);res.end('API not found');
    return;
  }

  const fp=path.join(__dirname,pathname);
  if(fs.existsSync(fp)&&fs.statSync(fp).isFile()) return serveFile(res,fp);
  serveFile(res,path.join(__dirname,'index.html'));
});

initDB().then(()=>{
  server.listen(PORT,'0.0.0.0',()=>console.log(`Maxima: http://localhost:${PORT}`));
});
