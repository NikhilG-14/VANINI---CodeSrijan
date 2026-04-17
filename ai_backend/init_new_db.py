import os
import sys
from ai_backend.db import init_db, logger

if __name__ == "__main__":
    print("Starting Database Schema Initialization on New Instance...")
    try:
        init_db()
        print("Successfully initialized all tables (game_sessions, cognitive_reports, user_memoirs, etc.)")
    except Exception as e:
        print(f"FAILED to initialize database: {e}")
        sys.exit(1)
