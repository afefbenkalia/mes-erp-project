-- Script SQL pour créer les tables du module Gestion des Machines
-- Base de données : PostgreSQL
-- Usage : psql -U postgres -d mes_db -f create_machines_tables.sql

-- Table machines
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    reference VARCHAR(80) NOT NULL UNIQUE,
    machine_type VARCHAR(80) NOT NULL,
    description VARCHAR(500),
    location VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_machines_id ON machines(id);
CREATE INDEX IF NOT EXISTS ix_machines_name ON machines(name);
CREATE INDEX IF NOT EXISTS ix_machines_reference ON machines(reference);

-- Table machine_state_history
CREATE TABLE IF NOT EXISTS machine_state_history (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    state VARCHAR(20) NOT NULL CHECK (state IN ('running', 'stopped', 'failure')),
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    comment VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_machine_state_history_id ON machine_state_history(id);
CREATE INDEX IF NOT EXISTS ix_machine_state_history_machine_id ON machine_state_history(machine_id);

-- Trigger pour updated_at sur machines
CREATE OR REPLACE FUNCTION update_machines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_machines_updated_at ON machines;
CREATE TRIGGER trigger_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW
    EXECUTE PROCEDURE update_machines_updated_at();
