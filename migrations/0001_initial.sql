-- tg_users 表
CREATE TABLE IF NOT EXISTS tg_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL UNIQUE,
  username TEXT DEFAULT NULL,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  max_sub INTEGER DEFAULT 5, -- 最大订阅数
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 为 tg_users 创建索引
CREATE INDEX IF NOT EXISTS idx_tg_users_chat_id ON tg_users(chat_id);

-- tg_keywords_sub 表
CREATE TABLE IF NOT EXISTS tg_keywords_sub (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  keywords_count INTEGER DEFAULT NULL,
  keyword1 TEXT NOT NULL,
  keyword2 TEXT DEFAULT NULL,
  keyword3 TEXT DEFAULT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 为 tg_keywords_sub 创建索引
CREATE INDEX IF NOT EXISTS idx_tg_keywords_sub_user_id ON tg_keywords_sub(user_id);

-- tg_push_logs 表
CREATE TABLE IF NOT EXISTS tg_push_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  chat_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  sub_id INTEGER NOT NULL,
  push_status INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 为 tg_push_logs 创建索引和唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS idx_tg_push_logs_user_chat ON tg_push_logs(chat_id, post_id);
CREATE INDEX IF NOT EXISTS idx_tg_push_logs_user_id ON tg_push_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_push_logs_post_id ON tg_push_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_tg_push_logs_push_status ON tg_push_logs(push_status);
