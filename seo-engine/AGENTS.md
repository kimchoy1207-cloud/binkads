# 미션
구글 SEO 자동화 엔진을 이 저장소에 완성한다. docker compose up 하나로 스택이 뜨고
키워드 수집, 발행, 색인, 링크, 리포트가 사람 개입 없이 순환해야 한다.

# 절대 규칙
1. 질문 금지. 모호하면 결정하고 docs/decisions/ADR-###.md 에 근거 기록.
2. API 키가 없어도 멈추지 마라. 모든 외부 연동은 providers/ 어댑터 뒤, MOCK_MODE=true 목업 동작.
3. API 필드 추측 금지. 방어적 파싱 + TODO.
4. 모든 태스크 멱등(ON CONFLICT, 자연키, 상태머신).
5. 외부 호출은 백오프+지터+서킷브레이커, 재시도 5회.
6. 마일스톤마다 커밋, PR 에 수용 기준 체크리스트.
7. 타입힌트 필수, ruff + mypy --strict, 커버리지 70%.
8. 시크릿 커밋 금지(.env.example 만).
9. 진행은 docs/PROGRESS.md 에 기록.
10. 각 모듈은 FF_* 플래그 기본 off.
11. 검색엔진 스팸 정책 위반 기능 금지 (ADR-002): 봇 클릭/CTR 조작, 탐지 회피(안티디텍트·주거용 프록시·캡차 우회), PBN, 가짜 계정·리뷰.

# 스택
Python 3.12 / FastAPI / SQLAlchemy async / Alembic / Celery+Redis / Postgres16+pgvector /
Playwright / Astro / Next.js / structlog / Prometheus / Docker Compose / Cloudflare API

# 모듈
M1 SERP수집(상위20, 자동완성, PAA BFS2, DR조회)
M2 점수화 클러스터링: score=(vol*intent)/(max(kd,1)*max(dr,1)), vol<30/kd>45/상위10중 DR30이상 3개면 탈락, 코사인0.86 클러스터
M3 콘텐츠: 상위 구조/엔티티 추출, 템플릿, 초안, 상위20% 재작성, 표1/수치3/FAQ4/결론 강제
M4 QC: 엔티티0.6, 고유데이터3, 단어1200, 밀도0.8~2.5%, 중복문장15%, 금지어0, 내부링크3, title60/desc155
M5 발행: Astro+Pages 또는 WP REST, 내부링크 그래프, 고아0
M6 색인: 내부링크3, 사이트맵, Search Console 사이트맵 제출, site: 검증
M7 링크: 백링크 모니터링(획득 링크 30일 생존검증, 앵커 분포 리포트), 아웃리치 후보 관리
M8 CTR: GSC 데이터 기반 title/description A/B 개선 (실제 사용자 CTR만)
M9 GBP/리포트: 리뷰 요청(실고객), geo-grid 순위 측정, GSC, 주간PDF, Slack, 3일 3계단 하락 알림

# 마일스톤
M0 골격/CI, M1 어댑터, M2 스키마/상태머신, M3 수집~QC, M4 발행/색인, M5 링크,
M6 CTR/GBP/리포트, M7 콘솔, M8 런북/비용가드

# 완료 조건
MOCK_MODE=true 에서 make demo 한 번으로 5키워드가 리포트까지 흐른다.
