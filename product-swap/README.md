# Product Swap — 레퍼런스 사진에 제품만 교체 → 포즈 숏폼

1. `references/` 에 모아둔 레퍼런스(셀카·착장 사진) 중 하나 선택
2. 제품 모델컷 업로드 (예: 유니클로 패딩 모델컷)
3. 레퍼런스 사람·포즈·배경은 그대로, **옷만 제품으로 교체**한 합성 이미지 생성 (OpenAI `gpt-image-2` 이미지 편집)
4. 합성 이미지를 포즈만 왔다갔다 하는 짧은 세로 영상으로 변환 (Higgsfield 기본, Sora 선택)

## 실행
```bash
cd product-swap
OPENAI_API_KEY=sk-... HIGGSFIELD_API_KEY=... HIGGSFIELD_API_SECRET=... \
HIGGSFIELD_I2V_URL=<Higgsfield image-to-video 제출 엔드포인트> PUBLIC_BASE_URL=<이 서버 외부주소> \
NODE_USE_ENV_PROXY=1 npm start      # http://localhost:4310
```
CLI: `node cli.js references/a.jpg product.jpg --video higgsfield`

| env | 설명 |
|---|---|
| `IMAGE_MODEL` | 기본 `gpt-image-2` |
| `INPUT_FIDELITY` | `gpt-image-1.5` 등 지원 모델에서만 `high` |
| `VIDEO_PROVIDER` | `higgsfield`(기본) / `sora` |

## 남은 작업
- Higgsfield 요청/응답 필드는 API 키 발급 후 실제 스펙에 맞춰 확인 필요 (`providers.js` 의 `higgsfieldVideo`)
- 오르카봇 스위트글램 구현(레퍼런스 수집/프롬프트)과 합치기: `COMPOSE_PROMPT`, `VIDEO_PROMPT`, `references/` 를 그쪽 자산으로 교체
