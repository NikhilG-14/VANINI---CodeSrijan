import os
import pickle
import logging
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv

# Load .env from same directory as this file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

from backend.utils.embedding import generate_text_embedding
from backend.logger import CustomFormatter

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

def upload_embeddings_to_mongo(file_contents):
    """
    Upload embeddings to PostgreSQL (legacy name preserved).
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
                logger.info(f"Uploaded {filename} to PostgreSQL.")
    except Exception as e:
        logger.error(f"Error uploading embeddings to PG: {e}")

# Initialize schema on load
try:
    init_db()
except Exception as e:
    logger.warning(f"Could not initialize DB on load (normal if DATABASE_URL is not set yet): {e}")
