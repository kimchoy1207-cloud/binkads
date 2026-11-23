from celery import Celery
from packages.shared.config import settings
celery = Celery("seo", broker=settings.redis_url, backend=settings.redis_url)
celery.conf.update(task_acks_late=True, worker_prefetch_multiplier=1, task_default_queue="q_serp")
celery.autodiscover_tasks(["apps.worker.tasks"])
