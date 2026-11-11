CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  can_read_novel INTEGER NOT NULL DEFAULT 1 CHECK (can_read_novel IN (0, 1)),
  created_at INTEGER NOT NULL
);

CREATE TABLE identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  login TEXT NOT NULL,
  PRIMARY KEY (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

CREATE TABLE oauth_credentials (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted TEXT NOT NULL,
  access_expires INTEGER NOT NULL,
  refresh_expires INTEGER NOT NULL,
  generation TEXT NOT NULL,
  refresh_lock_until INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, provider),
  FOREIGN KEY (user_id, provider) REFERENCES identities(user_id, provider)
);

CREATE TABLE sessions (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  family TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('auth', 'website')),
  device TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX sessions_family ON sessions(family);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE oauth_transactions (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  website_challenge TEXT NOT NULL,
  return_to TEXT NOT NULL,
  verifier TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience = 'website'),
  expires_at INTEGER NOT NULL
);

CREATE TABLE login_grants (
  hash TEXT PRIMARY KEY,
  transaction_hash TEXT NOT NULL UNIQUE,
  website_challenge TEXT NOT NULL,
  family TEXT NOT NULL,
  return_to TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience = 'website'),
  expires_at INTEGER NOT NULL
);

CREATE TABLE comment_requests (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE comment_locks (
  target TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE discussion_links (
  target TEXT PRIMARY KEY,
  discussion_id TEXT NOT NULL
);
