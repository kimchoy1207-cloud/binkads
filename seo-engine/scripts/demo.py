import asyncio
from packages.providers.serp import SerpProvider
from packages.providers.llm import LLMProvider
from packages.core.scoring import KeywordMetrics, score, is_eligible
from packages.core.qc import QcInput, evaluate
from packages.core.states import Status, assert_transition
KEYWORDS = ["강남 사무실 이사", "홍대 원룸 청소", "분당 정수기 렌탈", "마포 헬스장 추천", "송파 법무사 상담"]
async def main() -> None:
    for i, kw in enumerate(KEYWORDS):
        m = KeywordMetrics(volume=120 + i * 40, kd=18 + i * 3, top_dr_avg=25.0 + i, intent="commercial", top_dr30_count=1)
        if not is_eligible(m):
            print(f"{kw}: 탈락")
            continue
        serp = await SerpProvider().top_results(kw, limit=5)
        d = await LLMProvider().complete(f"# {kw}")
        fails = evaluate(QcInput(body=d.text * 40, keyword=kw, entity_coverage=0.8, unique_data_points=5, internal_links=5, title=kw[:40], description=kw[:80]))
        cur = Status.DISCOVERED
        for nxt in (Status.SCORED, Status.QUEUED, Status.DRAFTING, Status.QC_PASSED, Status.PUBLISHING, Status.PUBLISHED, Status.INDEXING, Status.INDEXED, Status.RANKING):
            assert_transition(cur, nxt)
            cur = nxt
        print(f"{kw}: score={score(m):.2f} serp={len(serp)} qc={fails or 'PASS'} state={cur}")
if __name__ == "__main__":
    asyncio.run(main())
