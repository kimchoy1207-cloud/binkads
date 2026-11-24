// 로컬 웹앱: 레퍼런스 선택 → 제품컷 업로드 → 합성 → 영상
import http from 'node:http';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeImage, makeVideo } from './providers.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REF_DIR = path.join(ROOT, 'references');
const OUT_DIR = path.join(ROOT, 'output');
const PORT = Number(process.env.PORT || 4310);
const IMG = /\.(jpe?g|png|webp)$/i;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };

const safe = (dir, name) => { const p = path.join(dir, path.basename(String(name || ''))); if (!p.startsWith(dir + path.sep)) throw new Error('bad path'); return p; };
const send = (res, code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
async function body(req, limit = 25 * 1024 * 1024) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) throw new Error('파일이 너무 큽니다'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/api/references') {
      return send(res, 200, (await readdir(REF_DIR)).filter((f) => IMG.test(f)).sort());
    }
    if (req.method === 'POST' && url.pathname === '/api/references') {
      const { name, dataUrl } = await body(req);
      const file = `${Date.now()}-${path.basename(name).replace(/[^\w.\-가-힣]/g, '_')}`;
      if (!IMG.test(file)) throw new Error('jpg/png/webp만 가능');
      await writeFile(safe(REF_DIR, file), Buffer.from(dataUrl.split(',')[1], 'base64'));
      return send(res, 200, { file });
    }
    if (req.method === 'POST' && url.pathname === '/api/compose') {
      const { reference, productDataUrl, faceDataUrl, extraPrompt } = await body(req);
      const ts = Date.now();
      const productPath = path.join(OUT_DIR, `${ts}-product.png`);
      await writeFile(productPath, Buffer.from(productDataUrl.split(',')[1], 'base64'));
      let facePath;
      if (faceDataUrl) { facePath = path.join(OUT_DIR, `${ts}-face.png`); await writeFile(facePath, Buffer.from(faceDataUrl.split(',')[1], 'base64')); }
      const png = await composeImage({ referencePath: safe(REF_DIR, reference), productPath, facePath, extraPrompt });
      const file = `${ts}-composite.png`;
      await writeFile(path.join(OUT_DIR, file), png);
      return send(res, 200, { file });
    }
    if (req.method === 'POST' && url.pathname === '/api/video') {
      const { image, provider, seconds } = await body(req);
      const mp4 = await makeVideo({ provider, imagePath: safe(OUT_DIR, image), seconds });
      const file = image.replace(/\.png$/, `-${provider}.mp4`);
      await writeFile(path.join(OUT_DIR, file), mp4);
      return send(res, 200, { file });
    }
    if (req.method === 'GET') {
      const [dir, name] = url.pathname.startsWith('/references/') ? [REF_DIR, url.pathname.slice(12)]
        : url.pathname.startsWith('/output/') ? [OUT_DIR, url.pathname.slice(8)]
        : [path.join(ROOT, 'public'), url.pathname === '/' ? 'index.html' : url.pathname.slice(1)];
      const p = safe(dir, decodeURIComponent(name));
      return send(res, 200, await readFile(p), TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream');
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, e.code === 'ENOENT' ? 404 : 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`Product Swap: http://localhost:${PORT}`));
