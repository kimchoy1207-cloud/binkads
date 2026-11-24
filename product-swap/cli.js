// 사용법: node cli.js <레퍼런스.jpg> <제품.jpg> [--video sora|higgsfield] [--seconds 8]
import { writeFile } from 'node:fs/promises';
import { composeImage, makeVideo } from './providers.js';
const [ref, product, ...rest] = process.argv.slice(2);
if (!ref || !product) { console.error('usage: node cli.js <reference> <product> [--video sora|higgsfield] [--seconds 8]'); process.exit(1); }
const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
const out = `output/${Date.now()}-composite.png`;
await writeFile(out, await composeImage({ referencePath: ref, productPath: product, quality: opt('--quality') || 'high' }));
console.log('합성 이미지:', out);
if (opt('--video')) {
  const mp4 = out.replace('.png', '.mp4');
  await writeFile(mp4, await makeVideo({ provider: opt('--video'), imagePath: out, seconds: opt('--seconds') || '5' }));
  console.log('영상:', mp4);
}
