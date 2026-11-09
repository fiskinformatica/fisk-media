-- Seed: insert the 13 Google Drive root folders
-- All sort_order values match the original config/drive.js order.

INSERT OR IGNORE INTO folders (id, name, drive_name, kind, sort_order) VALUES
  -- Audio folders (7)
  ('13AkH5a-R3vo7GusDrtno2GT_Ziwa5a7n', 'Essentials 1',  'Essentials 1',  'audio', 1),
  ('1ncrq4Rl4vIx-TS_-KHpLYsOjC8i1lwif', 'Essentials 2',  'Essentials 2',  'audio', 2),
  ('1snq7mtHv0HJPr_SXokfYiHrou_u_ZEzi', 'Transitions 1', 'Transitions 1', 'audio', 3),
  ('13yGr3Bo5rRUEvJ6JhIUo3HYxOEZr6BpW', 'Transitions 2', 'Transitions 2', 'audio', 4),
  ('1cGMiNjdYqKC7WUFdtKaGMXcwpwEfe2NF', 'Fluency 1',     'Fluency 1',     'audio', 5),
  ('161J8pT6z-T1htkCVybGelMpg3EM4kRxr', 'Fluency 2',     'Fluency 2',     'audio', 6),
  ('1cA7b4vCjhuE0xa2EtQwHFA3rq3UbB8jv', 'In Focus',      'In Focus',      'audio', 7),
  -- Video folders (6)
  ('1Im0EZZghHm27P2TAOKX5eD0Vv5ZmEpm-', 'Essentials 1',  'Essentials 1',  'video', 1),
  ('17Jnd7Mq5B1uDzJ408QU4MjzMYgIor-dz', 'Essentials 2',  'Essentials 2',  'video', 2),
  ('1jOAeE5_1OhPbmfv2hM21yGeJV8ZjzwG8', 'Transitions 1', 'Transitions 1', 'video', 3),
  ('1pSCHDCYvobzp7JXmnp9dID1BKnczriQA', 'Transitions 2', 'Transitions 2', 'video', 4),
  ('1qNiNdt_XhRPxRAv2f694Fy7uqKucIMOu', 'Fluency 1',     'Fluency 1',     'video', 5),
  ('1j5l0S7_kGLwFyFC7JdNFmsi8P9PpnoE2', 'Fluency 2',     'Fluency 2',     'video', 6);
