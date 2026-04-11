const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname);

// Veri dosyaları
const FILES = {
  cases:    path.join(DATA_DIR, 'cases.json'),
  events:   path.join(DATA_DIR, 'events.json'),
  todos:    path.join(DATA_DIR, 'todos.json'),
  calls:    path.join(DATA_DIR, 'calls.json'),
  chat:     path.join(DATA_DIR, 'chat.json'),
  users:    path.join(DATA_DIR, 'users.json'),
  logs:     path.join(DATA_DIR, 'logs.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
};

const DEFAULTS = {
  cases: '[]', events: '[]', todos: '[]', calls: '[]',
  chat: '[]', logs: '[]',
  users: '["Av. 1","Av. 2","Av. 3","Av. 4","Av. 5"]',
  settings: '{"theme":"dark","alarmDays":3}',
};

// Klasör ve dosyaları oluştur
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
Object.entries(FILES).forEach(([key, fpath]) => {
  if (!fs.existsSync(fpath)) fs.writeFileSync(fpath, DEFAULTS[key]);
});

// MIME tipleri
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

function readData(key) {
  try { return JSON.parse(fs.readFileSync(FILES[key], 'utf8')); }
  catch { return JSON.parse(DEFAULTS[key]); }
}

function writeData(key, data) {
  fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2));
}

function addLog(action, user, detail) {
  const logs = readData('logs');
  logs.push({ ts: new Date().toISOString(), user: user || '?', action, detail: detail || '' });
  if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  writeData('logs', logs);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // ── API ──────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const parts = pathname.split('/').filter(Boolean); // ['api','cases','id']
    const resource = parts[1];
    const id = parts[2];

    // Toplu veri al/yükle (yedek/geri yükle)
    if (pathname === '/api/backup' && method === 'GET') {
      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        cases:    readData('cases'),
        events:   readData('events'),
        todos:    readData('todos'),
        calls:    readData('calls'),
        chat:     readData('chat'),
        users:    readData('users'),
        logs:     readData('logs'),
        settings: readData('settings'),
      };
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="Maxima_Yedek_${new Date().toISOString().slice(0,10)}.json"`,
      });
      return res.end(JSON.stringify(backup, null, 2));
    }

    if (pathname === '/api/restore' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.cases) return json(res, { error: 'Geçersiz yedek dosyası' }, 400);
      ['cases','events','todos','calls','chat','users','logs','settings'].forEach(key => {
        if (body[key] !== undefined) writeData(key, body[key]);
      });
      addLog('Yedek Yüklendi', 'Sistem', `${body.cases?.length || 0} dava`);
      return json(res, { ok: true });
    }

    // Kullanıcılar
    if (resource === 'users') {
      if (method === 'GET') return json(res, readData('users'));
      if (method === 'POST') {
        const body = await parseBody(req);
        const users = readData('users');
        users.push(body.name);
        writeData('users', users);
        return json(res, { ok: true });
      }
      if (method === 'PUT' && id !== undefined) {
        const body = await parseBody(req);
        const users = readData('users');
        users[parseInt(id)] = body.name;
        writeData('users', users);
        return json(res, { ok: true });
      }
      if (method === 'DELETE' && id !== undefined) {
        const users = readData('users');
        users.splice(parseInt(id), 1);
        writeData('users', users);
        return json(res, { ok: true });
      }
    }

    // Settings
    if (resource === 'settings') {
      if (method === 'GET') return json(res, readData('settings'));
      if (method === 'POST') {
        const body = await parseBody(req);
        writeData('settings', body);
        return json(res, { ok: true });
      }
    }

    // Genel CRUD kaynakları: cases, events, todos, calls, chat, logs
    const RESOURCES = ['cases','events','todos','calls','chat','logs'];
    if (RESOURCES.includes(resource)) {
      if (method === 'GET') {
        const data = readData(resource);
        return json(res, data);
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        const data = readData(resource);
        const item = { ...body, id: body.id || Date.now().toString() + Math.random().toString(36).slice(2) };
        data.push(item);
        if (resource === 'cases') addLog('Dava Eklendi', body.createdBy, `Büro: ${body.buro} — ${body.muv}`);
        if (resource === 'calls') addLog('Arama Kaydedildi', body.createdBy, body.name);
        if (resource === 'todos') addLog('Görev Eklendi', body.createdBy, body.title);
        writeData(resource, data);
        return json(res, item);
      }
      if (method === 'PUT' && id) {
        const body = await parseBody(req);
        const data = readData(resource);
        const idx = data.findIndex(x => x.id === id);
        if (idx !== -1) {
          data[idx] = { ...data[idx], ...body, id };
          if (resource === 'cases') addLog('Dava Güncellendi', body.updatedBy, `Büro: ${body.buro} — ${body.muv}`);
          writeData(resource, data);
        }
        return json(res, { ok: true });
      }
      if (method === 'DELETE' && id) {
        const user = parsed.query.user || '?';
        let data = readData(resource);
        const item = data.find(x => x.id === id);
        data = data.filter(x => x.id !== id);
        if (resource === 'cases') {
          addLog('Dava Silindi', user, `Büro: ${item?.buro} — ${item?.muv}`);
          // İlgili auto event'leri de sil
          let events = readData('events');
          events = events.filter(e => e.caseId !== id || !e.auto);
          writeData('events', events);
        }
        writeData(resource, data);
        return json(res, { ok: true });
      }
      // Tüm listeyi güncelle (PUT /api/resource)
      if (method === 'PUT' && !id) {
        const body = await parseBody(req);
        if (Array.isArray(body)) {
          writeData(resource, body);
          return json(res, { ok: true });
        }
      }
    }

    res.writeHead(404); res.end('API not found');
    return;
  }

  // ── Statik dosyalar ──────────────────────────────────
  if (pathname === '/' || pathname === '/index.html') {
    return serveStatic(res, path.join(__dirname, 'index.html'));
  }
  const filePath = path.join(PUBLIC_DIR, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveStatic(res, filePath);
  }
  // SPA fallback
  serveStatic(res, path.join(__dirname, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Maxima sunucusu başladı`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`📂 Veri: ${DATA_DIR}\n`);
});
