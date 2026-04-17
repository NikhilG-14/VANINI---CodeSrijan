import os
import pickle
import logging
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv

# Load .env from same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

from ai_backend.utils.embedding import generate_text_embedding
from ai_backend.logger import CustomFormatter

# PostgreSQL Connection String
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_8l6CSWboPhGt@ep-silent-butterfly-am1tj9uq-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")


# Initialize db_conn as None globally to cache the connection
db_conn = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(CustomFormatter())
logger.addHandler(handler)

def get_db_connection():
    """
    Connect to the PostgreSQL database. Caches the connection.
    """
    global db_conn
    if db_conn is None or db_conn.closed:
        try:
            db_conn = psycopg2.connect(DATABASE_URL)
            db_conn.autocommit = True
            # Register pgvector
            with db_conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            register_vector(db_conn)
            logger.info("Connected to PostgreSQL database and initialized pgvector")
        except Exception as e:
            logger.error(f"Error connecting to PostgreSQL: {e}")
            return None
    return db_conn

def init_db():
    """
    Initialize the database schema (tables).
    """
    conn = get_db_connection()
    if not conn:
        return
    
    with conn.cursor() as cur:
        # Create reports table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT,
                location JSONB,
                contact_info TEXT,
                severity TEXT,
                culprit TEXT,
                relationship_to_culprit TEXT,
                other_info TEXT,
                status TEXT DEFAULT 'Pending',
                culprit_embedding vector(768)
            );
        """)
        
        # Create document_embeddings table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS document_embeddings (
                id SERIAL PRIMARY KEY,
                filename TEXT,
                content TEXT,
                embedding vector(768)
            );
        """)

        # Create game_sessions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS game_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT,
                game_type TEXT,
                session_start TIMESTAMP,
                session_end TIMESTAMP,
                actions JSONB,
                behavioral_signals JSONB,
                final_outcome JSONB,
                results JSONB,
                scores JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_game_sessions_user_time
            ON game_sessions (user_id, created_at DESC);
        """)

        # Backfill columns for existing deployments where game_sessions already exists
        cur.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_type TEXT;")
        cur.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS session_start TIMESTAMP;")
        cur.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS session_end TIMESTAMP;")
        cur.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS actions JSONB;")
        cur.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS behavioral_signals JSONB;")
        cur.execute("ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS final_outcome JSONB;")

        # Create chat_history table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT,
                role TEXT, -- 'user' or 'assistant'
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logger.info("Database schema initialized successfully")

def insert_data_into_db(
    name, location, contact_info, severity, culprit, relationship_to_culprit, other_info
):
    """
    Inserts a report into the 'reports' table.
    """
    conn = get_db_connection()
    if not conn:
        logger.error("Database connection is not available.")
        return None

    culprit_embedding = generate_text_embedding(culprit)
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO reports (
                    name, location, contact_info, severity, culprit, 
                    relationship_to_culprit, other_info, culprit_embedding
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                name, json.dumps(location), contact_info, severity, 
                culprit, relationship_to_culprit, other_info, culprit_embedding
            ))
            report_id = cur.fetchone()[0]
            logger.info(f"Inserted report with ID: {report_id}")
            return str(report_id)
    except Exception as e:
        logger.error(f"Error inserting data into PG: {e}")
        return None

def insert_game_session(user_id, results, scores):
    """
    Inserts a game session into the 'game_sessions' table.
    """
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO game_sessions (user_id, results, scores)
                VALUES (%s, %s, %s)
                RETURNING id;
            """, (user_id, json.dumps(results), json.dumps(scores)))
            session_id = cur.fetchone()[0]
            logger.info(f"Inserted game session with ID: {session_id}")
            return str(session_id)
    except Exception as e:
        logger.error(f"Error inserting game session: {e}")
        return None


def _to_datetime(value):
    """Parse ISO date strings safely."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def insert_detailed_game_session(payload):
    """
    Inserts an append-only, timeline-safe game session row.
    """
    conn = get_db_connection()
    if not conn:
        return None

    user_id = payload.get("user_id")
    if not user_id:
        logger.error("insert_detailed_game_session missing user_id")
        return None

    results = payload.get("results", [])
    scores = payload.get("scores", {})
    game_type = payload.get("game_type", "mixed")
    session_start = _to_datetime(payload.get("session_start"))
    session_end = _to_datetime(payload.get("session_end"))
    actions = payload.get("actions", [])
    behavioral_signals = payload.get("behavioral_signals", {})
    final_outcome = payload.get("final_outcome", {})

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO game_sessions (
                    user_id, game_type, session_start, session_end,
                    actions, behavioral_signals, final_outcome,
                    results, scores
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    user_id,
                    game_type,
                    session_start,
                    session_end,
                    json.dumps(actions),
                    json.dumps(behavioral_signals),
                    json.dumps(final_outcome),
                    json.dumps(results),
                    json.dumps(scores),
                ),
            )
            session_id = cur.fetchone()[0]
            logger.info(f"Inserted detailed game session with ID: {session_id}")
            return str(session_id)
    except Exception as e:
        logger.error(f"Error inserting detailed game session: {e}")
        return None


def get_game_sessions(user_id, limit=50):
    """
    Retrieves game sessions for a user ordered newest first.
    """
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id, user_id, game_type, session_start, session_end,
                    actions, behavioral_signals, final_outcome, results, scores, created_at
                FROM game_sessions
                WHERE user_id = %s
                  AND results IS NOT NULL
                  AND jsonb_typeof(results) = 'array'
                  AND jsonb_array_length(results) > 0
                  AND (game_type IS NOT NULL OR actions IS NOT NULL)
                ORDER BY created_at DESC
                LIMIT %s;
                """,
                (user_id, limit),
            )
            return cur.fetchall()
    except Exception as e:
        logger.error(f"Error retrieving game sessions: {e}")
        return []


def aggregate_behavior_from_sessions(sessions):
    """
    Produces compact aggregate trends from prior sessions.
    """
    if not sessions:
        return {
            "session_count": 0,
            "average_scores": {},
            "average_reaction_time_ms": None,
            "quit_early_ratio": 0,
            "trend": "insufficient_data",
        }

    score_totals = {}
    score_counts = {}
    total_rt = 0
    rt_samples = 0
    quit_early = 0
    game_rows = 0

    for session in sessions:
        scores = session.get("scores") or {}
        for key, value in scores.items():
            if isinstance(value, (int, float)):
                score_totals[key] = score_totals.get(key, 0) + value
                score_counts[key] = score_counts.get(key, 0) + 1

        for result in session.get("results") or []:
            game_rows += 1
            if result.get("quitEarly"):
                quit_early += 1
            for rt in result.get("reactionTimeMs") or []:
                if isinstance(rt, (int, float)):
                    total_rt += rt
                    rt_samples += 1

    avg_scores = {
        key: round(score_totals[key] / score_counts[key], 2)
        for key in score_totals
        if score_counts.get(key)
    }
    avg_rt = round(total_rt / rt_samples, 2) if rt_samples else None
    quit_ratio = round(quit_early / game_rows, 4) if game_rows else 0

    return {
        "session_count": len(sessions),
        "average_scores": avg_scores,
        "average_reaction_time_ms": avg_rt,
        "quit_early_ratio": quit_ratio,
        "trend": "stable",
    }

def insert_chat_message(user_id, role, content):
    """
    Inserts a chat message into the 'chat_history' table.
    """
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO chat_history (user_id, role, content)
                VALUES (%s, %s, %s)
                RETURNING id;
            """, (user_id, role, content))
            message_id = cur.fetchone()[0]
            logger.info(f"Inserted chat message with ID: {message_id}")
            return str(message_id)
    except Exception as e:
        logger.error(f"Error inserting chat message: {e}")
        return None

def get_chat_history(user_id, limit=20):
    """
    Retrieves the chat history for a specific user.
    """
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT role, content, created_at 
                FROM chat_history 
                WHERE user_id = %s 
                ORDER BY created_at ASC 
                LIMIT %s;
            """, (user_id, limit))
            return cur.fetchall()
    except Exception as e:
        logger.error(f"Error retrieving chat history: {e}")
        return []

def upload_document_embeddings(file_contents):
    """
    Upload embeddings to PostgreSQL.
    """
    conn = get_db_connection()
    if not conn:
        return

    try:
        with conn.cursor() as cur:
            for filename, content in file_contents:
                embedding = generate_text_embedding(content)
                cur.execute("""
                    INSERT INTO document_embeddings (filename, content, embedding)
                    VALUES (%s, %s, %s);
                """, (filename, content[:500], embedding))
                logger.info(f"Uploaded {filename} embeddings to PostgreSQL.")
    except Exception as e:
        logger.error(f"Error uploading embeddings to PG: {e}")

# Initialize schema on load
try:
    init_db()
except Exception as e:
    logger.warning(f"Could not initialize DB on load (normal if DATABASE_URL is not set yet): {e}")
