"""Database connection helper and migration runner for the budget pipeline."""

import os
from contextlib import contextmanager

import psycopg2

from pipeline.config import DATABASE_URL


@contextmanager
def get_db_connection(database_url: str = None):
    """Context manager for database connections with auto-commit on success.

    Usage:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
    """
    url = database_url or DATABASE_URL
    conn = psycopg2.connect(url)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def run_migrations(database_url: str = None, migrations_dir: str = None):
    """Execute numbered SQL migration files in order.

    Tracks applied migrations in a _migrations table to ensure
    idempotent execution. Migration files are sorted by name
    (e.g., 001_initial_schema.sql, 002_department_aliases.sql).

    Args:
        database_url: PostgreSQL connection string. Defaults to config.
        migrations_dir: Path to directory containing .sql files.
            Defaults to pipeline/migrations/.
    """
    url = database_url or DATABASE_URL
    if migrations_dir is None:
        migrations_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "migrations"
        )

    conn = psycopg2.connect(url)
    cur = conn.cursor()

    try:
        # Create migrations tracking table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        conn.commit()

        # Get already-applied migrations
        cur.execute("SELECT filename FROM _migrations")
        applied = {row[0] for row in cur.fetchall()}

        # Find and sort migration files
        migration_files = sorted(
            f for f in os.listdir(migrations_dir)
            if f.endswith(".sql")
        )

        applied_count = 0
        for filename in migration_files:
            if filename in applied:
                print(f"  SKIP {filename} (already applied)")
                continue

            filepath = os.path.join(migrations_dir, filename)
            with open(filepath) as f:
                sql = f.read()

            print(f"  APPLY {filename}")
            cur.execute(sql)
            cur.execute(
                "INSERT INTO _migrations (filename) VALUES (%s)",
                (filename,),
            )
            conn.commit()
            applied_count += 1

        if applied_count == 0:
            print("  All migrations already applied.")
        else:
            print(f"  Applied {applied_count} migration(s).")

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
