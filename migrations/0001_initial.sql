CREATE TABLE players (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

CREATE TABLE tournaments (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  best_of      INTEGER NOT NULL,
  status       TEXT NOT NULL,
  champion_id  TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE tournament_players (
  tournament_id  TEXT NOT NULL,
  player_id      TEXT NOT NULL,
  seed           INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, player_id)
);

CREATE TABLE matches (
  id             TEXT PRIMARY KEY,
  tournament_id  TEXT NOT NULL,
  round          INTEGER NOT NULL,
  position       INTEGER NOT NULL,
  player1_id     TEXT,
  player2_id     TEXT,
  winner_id      TEXT,
  scores         TEXT,
  status         TEXT NOT NULL,
  UNIQUE (tournament_id, round, position)
);

CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_tournament_players_player ON tournament_players(player_id);
