from pathlib import Path
from alembic import op
revision = "0001"
down_revision = None
def upgrade():
    op.execute(Path("infra/schema.sql").read_text())
def downgrade():
    op.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
