-- ============================================================
-- Φιλαθλητικός Tennis — Sample dataset
-- ------------------------------------------------------------
-- 16 club players (8 men, 8 women, Greek names) and 5 tournaments
-- across two categories. Two completed tournaments, two in-progress,
-- one in setup waiting on a bracket.
--
-- Apply locally:
--   npx wrangler d1 execute tennis-tournament-db --local --file=seeds/sample-data.sql
--
-- WARNING: this DELETEs every existing player, tournament, and match.
-- ============================================================

DELETE FROM matches;
DELETE FROM tournament_players;
DELETE FROM tournaments;
DELETE FROM players;

-- ─── Players ───────────────────────────────────────────────
INSERT INTO players (id, name, created_at) VALUES
  ('p-nikos',     'Νίκος Παπαδόπουλος',       1735689600000),
  ('p-kostas',    'Κωνσταντίνος Σπυρόπουλος', 1735689601000),
  ('p-aggelos',   'Άγγελος Δημητρίου',         1735689602000),
  ('p-stelios',   'Στέλιος Καρράς',            1735689603000),
  ('p-yiannis',   'Γιάννης Μαυρίδης',          1735689604000),
  ('p-petros',    'Πέτρος Ζαφειρίου',          1735689605000),
  ('p-manos',     'Μάνος Τσάκαλος',            1735689606000),
  ('p-dimitris',  'Δημήτρης Βλάχος',           1735689607000),
  ('p-eleni',     'Ελένη Κωνσταντίνου',        1735689608000),
  ('p-maria',     'Μαρία Παπανικολάου',        1735689609000),
  ('p-sofia',     'Σοφία Αντωνίου',            1735689610000),
  ('p-ioanna',    'Ιωάννα Μιχαηλίδου',         1735689611000),
  ('p-athena',    'Αθηνά Γεωργίου',            1735689612000),
  ('p-despoina',  'Δέσποινα Πετρίδου',         1735689613000),
  ('p-anna',      'Άννα Νικολάου',             1735689614000),
  ('p-christina', 'Χριστίνα Στεφανίδου',       1735689615000);

-- ─── Tournaments ───────────────────────────────────────────
INSERT INTO tournaments (id, name, category, best_of, status, champion_id, created_at) VALUES
  ('t-spring-men',     'Spring Open 2026',      'Open men''s',   3, 'completed',   'p-nikos', 1740825600000),
  ('t-spring-women',   'Spring Ladies 2026',    'Open women''s', 3, 'completed',   'p-eleni', 1740825700000),
  ('t-summer-men',     'Summer Cup 2026',       'Open men''s',   5, 'in_progress', NULL,      1746576000000),
  ('t-summer-women',   'Summer Ladies 2026',    'Open women''s', 3, 'in_progress', NULL,      1746576100000),
  ('t-autumn-men',     'Autumn Challenge 2026', 'Open men''s',   3, 'setup',       NULL,      1756684800000);

-- ─── Tournament players ────────────────────────────────────
-- Spring Open 2026 (men, completed, 8 players)
INSERT INTO tournament_players (tournament_id, player_id, seed) VALUES
  ('t-spring-men', 'p-nikos',    1),
  ('t-spring-men', 'p-dimitris', 2),
  ('t-spring-men', 'p-stelios',  3),
  ('t-spring-men', 'p-yiannis',  4),
  ('t-spring-men', 'p-aggelos',  5),
  ('t-spring-men', 'p-petros',   6),
  ('t-spring-men', 'p-kostas',   7),
  ('t-spring-men', 'p-manos',    8);

-- Spring Ladies 2026 (women, completed, 8 players)
INSERT INTO tournament_players (tournament_id, player_id, seed) VALUES
  ('t-spring-women', 'p-eleni',     1),
  ('t-spring-women', 'p-christina', 2),
  ('t-spring-women', 'p-ioanna',    3),
  ('t-spring-women', 'p-despoina',  4),
  ('t-spring-women', 'p-sofia',     5),
  ('t-spring-women', 'p-anna',      6),
  ('t-spring-women', 'p-maria',     7),
  ('t-spring-women', 'p-athena',    8);

-- Summer Cup 2026 (men, in progress, 8 players)
INSERT INTO tournament_players (tournament_id, player_id, seed) VALUES
  ('t-summer-men', 'p-aggelos',  1),
  ('t-summer-men', 'p-yiannis',  2),
  ('t-summer-men', 'p-nikos',    3),
  ('t-summer-men', 'p-manos',    4),
  ('t-summer-men', 'p-stelios',  5),
  ('t-summer-men', 'p-dimitris', 6),
  ('t-summer-men', 'p-kostas',   7),
  ('t-summer-men', 'p-petros',   8);

-- Summer Ladies 2026 (women, in progress, 4 players)
INSERT INTO tournament_players (tournament_id, player_id, seed) VALUES
  ('t-summer-women', 'p-sofia',    1),
  ('t-summer-women', 'p-athena',   2),
  ('t-summer-women', 'p-despoina', 3),
  ('t-summer-women', 'p-anna',     4);

-- Autumn Challenge 2026 (setup — players added but no bracket yet)
INSERT INTO tournament_players (tournament_id, player_id, seed) VALUES
  ('t-autumn-men', 'p-nikos',    0),
  ('t-autumn-men', 'p-kostas',   0),
  ('t-autumn-men', 'p-aggelos',  0),
  ('t-autumn-men', 'p-stelios',  0),
  ('t-autumn-men', 'p-yiannis',  0),
  ('t-autumn-men', 'p-dimitris', 0);

-- ─── Matches ───────────────────────────────────────────────
-- Spring Open 2026 (men, completed) — best of 3
INSERT INTO matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, scores, status) VALUES
  ('m-spring-men-1-0', 't-spring-men', 1, 0, 'p-nikos',    'p-dimitris', 'p-nikos',   '[[6,3],[6,4]]',       'completed'),
  ('m-spring-men-1-1', 't-spring-men', 1, 1, 'p-stelios',  'p-yiannis',  'p-stelios', '[[7,5],[4,6],[6,2]]', 'completed'),
  ('m-spring-men-1-2', 't-spring-men', 1, 2, 'p-aggelos',  'p-petros',   'p-aggelos', '[[6,2],[6,1]]',       'completed'),
  ('m-spring-men-1-3', 't-spring-men', 1, 3, 'p-kostas',   'p-manos',    'p-kostas',  '[[6,4],[6,4]]',       'completed'),
  ('m-spring-men-2-0', 't-spring-men', 2, 0, 'p-nikos',    'p-stelios',  'p-nikos',   '[[6,4],[7,6]]',       'completed'),
  ('m-spring-men-2-1', 't-spring-men', 2, 1, 'p-aggelos',  'p-kostas',   'p-kostas',  '[[5,7],[6,3],[6,4]]', 'completed'),
  ('m-spring-men-3-0', 't-spring-men', 3, 0, 'p-nikos',    'p-kostas',   'p-nikos',   '[[6,4],[7,6]]',       'completed');

-- Spring Ladies 2026 (women, completed) — best of 3
INSERT INTO matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, scores, status) VALUES
  ('m-spring-women-1-0', 't-spring-women', 1, 0, 'p-eleni',  'p-christina', 'p-eleni',  '[[6,2],[6,1]]',       'completed'),
  ('m-spring-women-1-1', 't-spring-women', 1, 1, 'p-ioanna', 'p-despoina',  'p-ioanna', '[[6,3],[7,5]]',       'completed'),
  ('m-spring-women-1-2', 't-spring-women', 1, 2, 'p-sofia',  'p-anna',      'p-sofia',  '[[6,4],[6,4]]',       'completed'),
  ('m-spring-women-1-3', 't-spring-women', 1, 3, 'p-maria',  'p-athena',    'p-maria',  '[[7,5],[4,6],[6,3]]', 'completed'),
  ('m-spring-women-2-0', 't-spring-women', 2, 0, 'p-eleni',  'p-ioanna',    'p-eleni',  '[[6,3],[6,4]]',       'completed'),
  ('m-spring-women-2-1', 't-spring-women', 2, 1, 'p-sofia',  'p-maria',     'p-maria',  '[[4,6],[6,2],[7,6]]', 'completed'),
  ('m-spring-women-3-0', 't-spring-women', 3, 0, 'p-eleni',  'p-maria',     'p-eleni',  '[[6,4],[7,5]]',       'completed');

-- Summer Cup 2026 (men, in progress) — best of 5; final pending
INSERT INTO matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, scores, status) VALUES
  ('m-summer-men-1-0', 't-summer-men', 1, 0, 'p-aggelos', 'p-yiannis',  'p-aggelos', '[[6,4],[6,3],[6,2]]',       'completed'),
  ('m-summer-men-1-1', 't-summer-men', 1, 1, 'p-nikos',   'p-manos',    'p-nikos',   '[[6,2],[6,2],[6,1]]',       'completed'),
  ('m-summer-men-1-2', 't-summer-men', 1, 2, 'p-stelios', 'p-dimitris', 'p-stelios', '[[7,5],[6,4],[6,3]]',       'completed'),
  ('m-summer-men-1-3', 't-summer-men', 1, 3, 'p-kostas',  'p-petros',   'p-kostas',  '[[6,3],[6,1],[6,2]]',       'completed'),
  ('m-summer-men-2-0', 't-summer-men', 2, 0, 'p-aggelos', 'p-nikos',    'p-nikos',   '[[4,6],[6,3],[6,2],[6,4]]', 'completed'),
  ('m-summer-men-2-1', 't-summer-men', 2, 1, 'p-stelios', 'p-kostas',   'p-kostas',  '[[6,4],[4,6],[7,5],[6,3]]', 'completed'),
  ('m-summer-men-3-0', 't-summer-men', 3, 0, 'p-nikos',   'p-kostas',   NULL,        NULL,                        'pending');

-- Summer Ladies 2026 (women, in progress) — 4 players
INSERT INTO matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, scores, status) VALUES
  ('m-summer-women-1-0', 't-summer-women', 1, 0, 'p-sofia',    'p-athena',   'p-sofia',    '[[6,2],[6,3]]',       'completed'),
  ('m-summer-women-1-1', 't-summer-women', 1, 1, 'p-despoina', 'p-anna',     'p-despoina', '[[6,4],[4,6],[6,2]]', 'completed'),
  ('m-summer-women-2-0', 't-summer-women', 2, 0, 'p-sofia',    'p-despoina', NULL,         NULL,                  'pending');
