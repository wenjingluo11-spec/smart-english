"""Create gamification tables (user_xp, achievements, daily_missions).

Run: python -m scripts.create_gamification_tables
"""

import asyncio
from sqlalchemy import text
from app.database import engine


TABLES_SQL = """
CREATE TABLE IF NOT EXISTS user_xp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_active_date VARCHAR(10),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    icon VARCHAR(10) DEFAULT '🏆',
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS daily_missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date VARCHAR(10) NOT NULL,
    mission_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    target INTEGER DEFAULT 1,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    xp_reward INTEGER DEFAULT 20,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS ix_user_xp_user_id ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS ix_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS ix_daily_missions_user_id ON daily_missions(user_id);
CREATE INDEX IF NOT EXISTS ix_daily_missions_date ON daily_missions(date);
"""


async def main():
    async with engine.begin() as conn:
        for statement in TABLES_SQL.strip().split(";"):
            statement = statement.strip()
            if statement:
                await conn.execute(text(statement))
    print("Gamification tables created successfully.")


if __name__ == "__main__":
    asyncio.run(main())
