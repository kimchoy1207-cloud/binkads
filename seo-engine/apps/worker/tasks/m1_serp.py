import asyncio
from apps.worker.celery_app import celery
from packages.providers.serp import SerpProvider
@celery.task(name="m1.collect_serp", bind=True, max_retries=5)
def collect_serp(self, keyword: str) -> dict:
    try:
        r = asyncio.run(SerpProvider().top_results(keyword))
        return {"keyword": keyword, "count": len(r)}
    except Exception as e:
        raise self.retry(exc=e)
