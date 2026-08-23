-- Anonymous installation analytics schema.
-- No PII: install_id is a client-generated UUID only.

CREATE TABLE installations (
    install_id TEXT PRIMARY KEY,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    first_version TEXT,
    last_version TEXT,
    platform TEXT,
    arch TEXT
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    install_id TEXT NOT NULL,
    event TEXT NOT NULL,
    version TEXT,
    platform TEXT,
    arch TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (install_id) REFERENCES installations(install_id)
);

CREATE INDEX idx_events_install_id ON events(install_id);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_event_created_at ON events(event, created_at);
CREATE INDEX idx_installations_platform ON installations(platform);
CREATE INDEX idx_installations_last_seen_at ON installations(last_seen_at);
CREATE INDEX idx_installations_first_seen_at ON installations(first_seen_at);
CREATE INDEX idx_installations_last_version ON installations(last_version);
