// 이미지 합성 / 영상 생성 프로바이더. 의존성 없음 (Node 22 내장 fetch/FormData).
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const OPENAI = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const openaiHeaders = () => ({ Authorization: `Bearer ${process.env.OPENAI_API_KEY || 'proxy-injected'}` });
const mime = (f) => ({ '.png': 'image/png', '.webp': 'image/webp' }[path.extname(f).toLowerCase()] || 'image/jpeg');
const asBlob = async (f) => new Blob([await readFile(f)], { type: mime(f) });

export const COMPOSE_PROMPT = `Image 1 is the REFERENCE scene. Image 2 is the PRODUCT (garment) photo.
Re-create image 1 exactly — same person, face, hairstyle, pose, phone, accessories, background, lighting, framing and camera angle —
but replace ONLY the matching garment on the person with the product from image 2.
Keep the product's exact color, material sheen, quilting/stitch pattern, collar shape and length.
Fit it naturally to the body and pose with realistic folds, shadows and reflections. Do not add text, logos or watermarks.`;

/** 레퍼런스 + 제품 → 제품만 교체된 이미지(PNG Buffer) */
async function openaiComposeImage({ referencePath, productPath, facePath, extraPrompt = '', size = '1024x1536', quality = 'high' }) {
  const fd = new FormData();
  fd.append('model', process.env.IMAGE_MODEL || 'gpt-image-2');
  fd.append('image[]', await asBlob(referencePath), path.basename(referencePath));
  fd.append('image[]', await asBlob(productPath), path.basename(productPath));
  if (facePath) fd.append('image[]', await asBlob(facePath), path.basename(facePath));
  fd.append('prompt', buildPrompt(extraPrompt, facePath));
  if (process.env.INPUT_FIDELITY) fd.append('input_fidelity', process.env.INPUT_FIDELITY); // gpt-image-1.5 등 지원 모델만
  fd.append('size', size);
  fd.append('quality', quality);
  const res = await fetch(`${OPENAI}/images/edits`, { method: 'POST', headers: openaiHeaders(), body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(`이미지 합성 실패: ${json.error?.message || res.status}`);
  return Buffer.from(json.data[0].b64_json, 'base64');
}

export const FACE_PROMPT = `IDENTITY CHANGE REQUIRED: the LAST image is a FACE reference of a different person.
The person in the result MUST be clearly recognizable as the person in the face reference — same face shape, eyes, eyebrows, nose, lips,
jawline and skin tone. Do NOT keep the original person's facial identity. Keep the pose, head angle, phone, hairstyle, outfit and background
from image 1. If sunglasses hide the eyes, keep the sunglasses but make every visible feature match the face reference.`;
const buildPrompt = (extraPrompt, facePath) =>
  [COMPOSE_PROMPT, facePath ? FACE_PROMPT : '', extraPrompt ? `Additional: ${extraPrompt}` : ''].filter(Boolean).join('\n');

export const VIDEO_PROMPT = `Short vertical fashion clip from this exact image. The person stays in place and naturally shifts between
a few mirror-selfie poses: turns slightly left and right, adjusts the jacket collar, tilts head. Subtle, smooth motion,
identical outfit, face and background throughout. Static camera, no text.`;

/** OpenAI Sora — 이미지 → 영상. 반환: mp4 Buffer */
async function soraVideo({ imagePath, prompt, seconds = '8' }) {
  const fd = new FormData();
  fd.append('model', process.env.VIDEO_MODEL || 'sora-2');
  fd.append('prompt', prompt);
  fd.append('seconds', String(seconds));
  fd.append('size', '720x1280');
  fd.append('input_reference', await asBlob(imagePath), path.basename(imagePath));
  let res = await fetch(`${OPENAI}/videos`, { method: 'POST', headers: openaiHeaders(), body: fd });
  let job = await res.json();
  if (!res.ok) throw new Error(`영상 요청 실패: ${job.error?.message || res.status}`);
  while (job.status === 'queued' || job.status === 'in_progress') {
    await new Promise((r) => setTimeout(r, 5000));
    job = await (await fetch(`${OPENAI}/videos/${job.id}`, { headers: openaiHeaders() })).json();
  }
  if (job.status !== 'completed') throw new Error(`영상 생성 실패: ${job.error?.message || job.status}`);
  const content = await fetch(`${OPENAI}/videos/${job.id}/content`, { headers: openaiHeaders() });
  return Buffer.from(await content.arrayBuffer());
}

/**
 * Higgsfield — 이미지 → 영상. API 스펙은 계정 발급 후 확인 필요하므로 URL/모델을 env로 설정.
 * HIGGSFIELD_API_KEY, HIGGSFIELD_API_SECRET, HIGGSFIELD_I2V_URL(제출 엔드포인트)
 * 이미지는 공개 URL이 필요할 수 있음 → PUBLIC_BASE_URL(이 서버의 외부 주소)로 전달.
 */
async function higgsfieldVideo({ imagePath, prompt, seconds = 5 }) {
  const url = process.env.HIGGSFIELD_I2V_URL;
  if (!url || !process.env.HIGGSFIELD_API_KEY) throw new Error('Higgsfield 설정 없음 (HIGGSFIELD_API_KEY / HIGGSFIELD_I2V_URL)');
  if (!process.env.PUBLIC_BASE_URL) throw new Error('Higgsfield는 이미지 공개 URL 필요: PUBLIC_BASE_URL 설정');
  const headers = {
    'Content-Type': 'application/json',
    'hf-api-key': process.env.HIGGSFIELD_API_KEY,
    'hf-secret': process.env.HIGGSFIELD_API_SECRET || '',
  };
  const imageUrl = `${process.env.PUBLIC_BASE_URL}/output/${path.basename(imagePath)}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ prompt, image_url: imageUrl, duration: Number(seconds) }) });
  let job = await res.json();
  if (!res.ok) throw new Error(`Higgsfield 요청 실패: ${JSON.stringify(job).slice(0, 300)}`);
  const statusUrl = job.status_url || `${url.replace(/\/$/, '')}/${job.id || job.request_id}`;
  for (let i = 0; i < 120; i++) {
    const s = job.status?.toLowerCase();
    const out = job.video?.url || job.output?.video_url || job.result?.url;
    if (out) return Buffer.from(await (await fetch(out)).arrayBuffer());
    if (s === 'failed' || s === 'nsfw' || s === 'error') throw new Error(`Higgsfield 실패: ${s}`);
    await new Promise((r) => setTimeout(r, 5000));
    job = await (await fetch(statusUrl, { headers })).json();
  }
  throw new Error('Higgsfield 시간 초과');
}

export const VIDEO_PROVIDERS = { sora: soraVideo, higgsfield: higgsfieldVideo };
export async function makeVideo({ provider = process.env.VIDEO_PROVIDER || 'fal', ...opts }) {
  const fn = VIDEO_PROVIDERS[provider];
  if (!fn) throw new Error(`알 수 없는 영상 프로바이더: ${provider}`);
  return fn({ prompt: VIDEO_PROMPT, ...opts });
}

// ── fal.ai ── FAL_KEY 필요. 이미지는 data URI로 전달(공개 URL 불필요).
const FAL = 'https://queue.fal.run';
const falHeaders = () => ({ Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' });
const dataUri = async (f) => `data:${mime(f)};base64,${(await readFile(f)).toString('base64')}`;
async function falRun(app, input) {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY 설정 필요');
  const res = await fetch(`${FAL}/${app}`, { method: 'POST', headers: falHeaders(), body: JSON.stringify(input) });
  const job = await res.json();
  if (!res.ok) throw new Error(`fal 요청 실패: ${JSON.stringify(job).slice(0, 300)}`);
  for (let i = 0; i < 240; i++) {
    const s = await (await fetch(job.status_url, { headers: falHeaders() })).json();
    if (s.status === 'COMPLETED') break;
    if (s.status === 'FAILED' || s.error) throw new Error(`fal 실패: ${s.error || s.status}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const out = await fetch(job.response_url, { headers: falHeaders() });
  const json = await out.json();
  if (!out.ok) throw new Error(`fal 결과 오류: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}
const download = async (url) => Buffer.from(await (await fetch(url)).arrayBuffer());

/** fal 이미지 합성 (기본 nano-banana edit). 반환: 이미지 Buffer */
export async function falComposeImage({ referencePath, productPath, facePath, extraPrompt = '' }) {
  const images = [referencePath, productPath, facePath].filter(Boolean);
  const out = await falRun(process.env.FAL_IMAGE_MODEL || 'fal-ai/nano-banana-pro/edit', {
    prompt: buildPrompt(extraPrompt, facePath),
    image_urls: await Promise.all(images.map(dataUri)),
    num_images: 1,
  });
  return download(out.images[0].url);
}

/** fal 이미지→영상 (기본 Kling 2.1). */
async function falVideo({ imagePath, prompt, seconds = 5 }) {
  const out = await falRun(process.env.FAL_VIDEO_MODEL || 'fal-ai/kling-video/v2.1/standard/image-to-video', {
    prompt, image_url: await dataUri(imagePath), duration: Number(seconds) >= 10 ? '10' : '5',
  });
  return download(out.video.url);
}
VIDEO_PROVIDERS.fal = falVideo;

/** IMAGE_PROVIDER=fal|openai (기본 fal) */
export async function composeImage(opts) {
  return (process.env.IMAGE_PROVIDER || 'fal') === 'openai' ? openaiComposeImage(opts) : falComposeImage(opts);
}
