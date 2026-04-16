import os
import psycopg2
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def test_connection():
    try:
        print(f"Connecting to: {DATABASE_URL.split('@')[-1]}")
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        with conn.cursor() as cur:
            print("Connected! Enabling pgvector...")
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            register_vector(conn)
            
            print("Creating tables...")
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
            print("Tables created successfully!")
        conn.close()
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if test_connection():
        print("Backend data migration (schema) successful!")
    else:
        print("Backend data migration failed.")
