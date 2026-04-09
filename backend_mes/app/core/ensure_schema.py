"""Idempotent DDL for dev DBs created before model changes (create_all does not alter tables)."""

from sqlalchemy import text

from app.database import engine


def ensure_users_hashed_password_column() -> None:
    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'users'
                  AND column_name = 'hashed_password'
                """
            )
        ).first()
        if row is None:
            conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR"))


def ensure_productions_of_id_column() -> None:
    """ORM expects productions.of_id; older DBs may lack it after model changes."""
    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'productions'
                  AND column_name = 'of_id'
                """
            )
        ).first()
        if row is None:
            conn.execute(text("ALTER TABLE productions ADD COLUMN of_id INTEGER"))
            conn.execute(
                text(
                    """
                    DO $blk$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = 'public'
                              AND table_name = 'ordres_fabrication'
                        ) AND NOT EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'productions_of_id_fkey'
                        ) THEN
                            ALTER TABLE productions
                            ADD CONSTRAINT productions_of_id_fkey
                            FOREIGN KEY (of_id) REFERENCES ordres_fabrication(id);
                        END IF;
                    END
                    $blk$;
                    """
                )
            )
