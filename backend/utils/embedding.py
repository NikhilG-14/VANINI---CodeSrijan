import os
import google.generativeai as genai
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)


def generate_text_embedding(text):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    response = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document",
        title="Embedding of culprit info",
    )
    return response["embedding"]


def calculate_similarity_percentage(query_vector, result_vector):
    # Calculate Euclidean distance manually
    distance = sum((q - r) ** 2 for q, r in zip(query_vector, result_vector)) ** 0.5

    # Estimate a maximum possible distance for normalization, e.g., sqrt(768) for 768-dimensional vectors
    max_distance = len(query_vector) ** 0.5

    # Convert distance to a similarity percentage
    similarity_percentage = max(0, (1 - distance / max_distance) * 100)
    return round(similarity_percentage, 2)


def find_top_matches(
    db_conn, description_embedding, num_results=1, table_name="reports", vector_col="culprit_embedding"
):
    """
    Find top matches using PostgreSQL pgvector.
    db_conn should be a psycopg2 connection.
    """
    if not db_conn:
        return []

    try:
        with db_conn.cursor(cursor_factory=None) as cur:
            # Using <-> for Euclidean distance (L2) or <=> for Cosine distance
            # Given calculate_similarity_percentage uses Euclidean, we'll use <->
            query = f"""
                SELECT *, ( {vector_col} <-> %s ) AS distance
                FROM {table_name}
                ORDER BY distance ASC
                LIMIT %s;
            """
            cur.execute(query, (description_embedding, num_results))
            
            # Fetch all columns and convert to list of dicts for compatibility
            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
            
            return results
    except Exception as e:
        print(f"Error performing vector search in PG: {e}")
        return []
