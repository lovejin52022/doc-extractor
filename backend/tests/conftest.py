import pytest

from app.store import store


@pytest.fixture(autouse=True)
def clean_db():
    with store._conn() as conn:
        conn.execute("DELETE FROM tasks")
        conn.execute("DELETE FROM documents")
        conn.execute("DELETE FROM tags")
    yield
