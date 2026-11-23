import asyncio
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from packages.shared.config import settings
def run(conn):
    context.configure(connection=conn, target_metadata=None)
    with context.begin_transaction():
        context.run_migrations()
async def main():
    e = create_async_engine(settings.database_url)
    async with e.connect() as c:
        await c.run_sync(run)
    await e.dispose()
asyncio.run(main())
