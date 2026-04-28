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


def ensure_users_activity_columns() -> None:
    with engine.begin() as conn:
        row_last_login = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'users'
                  AND column_name = 'last_login'
                """
            )
        ).first()
        if row_last_login is None:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login TIMESTAMP"))

        row_login_count = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'users'
                  AND column_name = 'login_count'
                """
            )
        ).first()
        if row_login_count is None:
            conn.execute(text("ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0 NOT NULL"))


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


def ensure_preventive_maintenance_columns() -> None:
    with engine.begin() as conn:
        checks_and_ddls = [
            (
                "trigger_mode",
                "ALTER TABLE preventive_maintenance ADD COLUMN trigger_mode VARCHAR(20) DEFAULT 'SCHEDULED' NOT NULL",
            ),
            (
                "runtime_threshold_minutes",
                "ALTER TABLE preventive_maintenance ADD COLUMN runtime_threshold_minutes INTEGER",
            ),
            (
                "last_triggered_at",
                "ALTER TABLE preventive_maintenance ADD COLUMN last_triggered_at TIMESTAMP",
            ),
        ]
        for column_name, ddl in checks_and_ddls:
            row = conn.execute(
                text(
                    f"""
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'preventive_maintenance'
                      AND column_name = '{column_name}'
                    """
                )
            ).first()
            if row is None:
                conn.execute(text(ddl))


def ensure_machine_state_history_changed_by() -> None:
    """Add changed_by column to machine_state_history for audit trail."""
    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'machine_state_history'
                  AND column_name = 'changed_by'
                """
            )
        ).first()
        if row is None:
            conn.execute(
                text("ALTER TABLE machine_state_history ADD COLUMN changed_by VARCHAR(120)")
            )


def ensure_operator_actions_table_dropped() -> None:
    """
    operator_actions was written only by a dead /api/operator/change-state endpoint.
    The active operator flow (machineAPI.changeState) writes to machine_state_history
    with changed_by set, making this table redundant. Drop it if it still exists.
    """
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS operator_actions CASCADE"))


def ensure_machine_data_table_dropped() -> None:
    """
    machine_data was a write-only IoT sink with no reader — dead weight.
    Drop it if it still exists.
    """
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS machine_data CASCADE"))


def ensure_initial_state_history_seeded() -> None:
    """
    Machines created before the create_machine fix have a machine_operational_status
    row but zero machine_state_history rows. Without a history entry, runtime_cache
    computes marche_seconds=0 and emits runtime_minutes=0 forever.

    For each such machine: insert one open entry using the state and last_update
    already recorded in machine_operational_status. Idempotent — skips machines
    that already have at least one history row.
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO machine_state_history
                    (machine_id, state, started_at, ended_at, changed_by, created_at)
                SELECT
                    mos.machine_id,
                    CAST(mos.state AS TEXT),
                    mos.last_update,
                    NULL,
                    'system',
                    NOW()
                FROM machine_operational_status mos
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM machine_state_history msh
                    WHERE msh.machine_id = mos.machine_id
                )
                """
            )
        )


def ensure_machines_reference_not_unique() -> None:
    """Allow duplicate machine references by removing unique DB constraints/indexes."""
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                DO $blk$
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN
                        SELECT c.conname
                        FROM pg_constraint c
                        JOIN pg_class t ON t.oid = c.conrelid
                        JOIN pg_namespace n ON n.oid = t.relnamespace
                        WHERE n.nspname = 'public'
                          AND t.relname = 'machines'
                          AND c.contype = 'u'
                          AND EXISTS (
                              SELECT 1
                              FROM unnest(c.conkey) AS colnum
                              JOIN pg_attribute a
                                ON a.attrelid = c.conrelid
                               AND a.attnum = colnum
                              WHERE a.attname = 'reference'
                          )
                    LOOP
                        EXECUTE format('ALTER TABLE public.machines DROP CONSTRAINT IF EXISTS %I', r.conname);
                    END LOOP;

                    FOR r IN
                        SELECT i.indexname
                        FROM pg_indexes i
                        WHERE i.schemaname = 'public'
                          AND i.tablename = 'machines'
                          AND i.indexdef ILIKE 'CREATE UNIQUE INDEX%'
                          AND i.indexdef ILIKE '%(reference%'
                    LOOP
                        EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
                    END LOOP;
                END
                $blk$;
                """
            )
        )
