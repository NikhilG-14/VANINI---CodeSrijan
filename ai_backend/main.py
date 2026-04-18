# Built-in libraries
import base64
import json
import logging
import os
import uuid
from typing import List

# External dependencies
import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from ai_backend.db import get_db_connection, upload_document_embeddings
from psycopg2.extras import RealDictCursor
from ai_backend.logger import CustomFormatter
from ai_backend.schema import FileContent, PostInfo
from ai_backend.utils.common import (load_image_from_url_or_file,
                                  read_files_from_directory,
                                  serialize_db_data)
from ai_backend.utils.embedding import find_top_matches, generate_text_embedding
from ai_backend.utils.regex_ptr import extract_info
from ai_backend.utils.steganography import (decode_text_from_image,
                                         encode_text_in_image)
from ai_backend.utils.text_llm import (create_poem, decompose_user_text,
                                    expand_user_text_using_gemini,
                                    expand_user_text_using_gemma,
                                    expand_user_text_with_priority,
                                    text_to_image)
from ai_backend.utils.twitter import send_message_to_twitter

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(CustomFormatter())
logger.addHandler(handler)

# Cached database connection
db = None

# Initialize FastAPI
app = FastAPI()

# Ensure uploads directory exists
UPLOAD_DIR = "ai_backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files to serve images locally
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def initialize_database():
    global db
    if db is None:
        db = get_db_connection()  # Establish PG connection

# Call the initialize function at startup
@app.on_event("startup")
async def startup_event():
    initialize_database()

# API Endpoints
@app.post("/text-generation")
async def get_post_and_expand_its_content(post_info: PostInfo):
    """Expand user input text for help message generation."""
    try:
        concatenated_text = (
            f"Name: {post_info.name}\n"
            f"Phone: {post_info.phone}\n"
            f"Location: {post_info.location}\n"
            f"Duration of Abuse: {post_info.duration_of_abuse}\n"
            f"Frequency of Incidents: {post_info.frequency_of_incidents}\n"
            f"Preferred Contact Method: {post_info.preferred_contact_method}\n"
            f"Current Situation: {post_info.current_situation}\n"
            f"Culprit Description: {post_info.culprit_description}\n"
            f"Custom Text: {post_info.custom_text}\n"
        )
        llama_response = await expand_user_text_with_priority(concatenated_text)
        gemini_response = await expand_user_text_using_gemini(concatenated_text)
        gemma_response = await expand_user_text_using_gemma(concatenated_text)
        return {
            "llama_response": llama_response,
            "gemini_response": gemini_response, 
            "gemma_response": gemma_response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error expanding text: {e}")

@app.post("/img-generation")
async def create_image_from_prompt(input_data: str):
    """Generate an image based on a text prompt."""
    try:
        text_to_image(input_data)
        return {"received_text": input_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating image: {e}")


@app.post("/text-decomposition")
async def decompose_text_content(data: dict):
    """Decompose and extract information from user text."""
    try:
        text = data.get("text")
        decomposed_text = decompose_user_text(text)
        return {"extracted_data": extract_info(decomposed_text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error decomposing text: {e}")


@app.post("/save-extracted-data")
async def save_extracted_data(data: dict):
    try:
        # data format from decomposition: {'name', 'location', 'contact_info', 'severity', 'culprit', 'relationship_to_culprit', 'other_info'}
        from ai_backend.db import insert_data_into_db
        result_id = insert_data_into_db(
            data.get("name"),
            data.get("location"),
            data.get("contact_info"),
            data.get("severity"),
            data.get("culprit"),
            data.get("relationship_to_culprit"),
            data.get("other_info")
        )
        if result_id:
            return {"status": "Data saved successfully", "id": result_id}
        else:
            raise Exception("Insertion failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving data: {e}")


@app.post("/encode")
async def encode_text_in_image_endpoint(
    text: str, img_url: str = None, file: UploadFile = File(None)
):
    """Encode text into an image."""
    try:
        image = load_image_from_url_or_file(img_url, file)
        encoded_image = encode_text_in_image(image, text)
        filename = f"encoded_{uuid.uuid4().hex}.png"
        output_path = os.path.join(UPLOAD_DIR, filename)
        encoded_image.save(output_path, format="PNG")
        
        # Return the local URL instead of the file stream for consistency with the frontend expectations
        self_url = os.getenv("SELF_URL", "http://localhost:8000")
        local_url = f"{self_url}/uploads/{filename}"
        return {"encoded_image_url": local_url}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error encoding text in image: {e}"
        )


@app.post("/decode")
async def decode_text_from_image_endpoint(
    img_url: str = None, file: UploadFile = File(None)
):
    """Decode text from an image."""
    try:
        image = load_image_from_url_or_file(img_url, file)
        return {"decoded_text": decode_text_from_image(image)}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error decoding text from image: {e}"
        )


@app.get("/poem-generation")
async def create_poem_endpoint(text: str):
    """Generate an inspirational poem based on input text."""
    try:
        return {"poem": create_poem(text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating poem: {e}")


@app.post("/send-message")
async def send_message_to_twitter_endpoint(image_url: str, caption: str):
    """Send a message to Twitter."""
    try:
        send_message_to_twitter(image_url, caption)
        return {"status": "Message sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error sending message to Twitter: {e}"
        )


@app.get("/get-admin-posts")
def get_all_posts():
    """Retrieve all posts from the PostgreSQL database."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM reports;")
            columns = [desc[0] for desc in cur.description]
            posts = [dict(zip(columns, row)) for row in cur.fetchall()]
        return JSONResponse(content=serialize_db_data(posts))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving posts: {e}")


@app.get("/find-match")
def find_top_matching_posts(info: str, collection: str = "reports"):
    """Find top matches based on embedding similarity using PostgreSQL."""
    try:
        description_vector = generate_text_embedding(info)
        table_name = "document_embeddings" if collection == "doc_embedding" else "reports"
        vector_col = "embedding" if collection == "doc_embedding" else "culprit_embedding"
        
        conn = get_db_connection()
        top_matches = find_top_matches(conn, description_vector, table_name=table_name, vector_col=vector_col)
        return serialize_db_data(top_matches)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding matches: {e}")


@app.get("/get-post/{post_id}")
def get_post_by_id(post_id: str):
    """Retrieve a specific post by its ID using PostgreSQL."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM reports WHERE id = %s;", (post_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Post not found")
            columns = [desc[0] for desc in cur.description]
            post = dict(zip(columns, row))
        return JSONResponse(content=serialize_db_data(post))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving post by ID: {e}")

@app.post("/close-issue/{issue_id}")
async def close_issue(issue_id: str):
    """Mark an issue as closed in PostgreSQL."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("UPDATE reports SET status = 'closed' WHERE id = %s;", (issue_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Issue not found or already closed")
        return {"status": "Issue marked as closed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error closing issue: {e}")

@app.post("/upload_embeddings/")
async def upload_embeddings():
    """Upload document embeddings to the database."""
    try:
        file_contents = read_files_from_directory("ai_backend/docs")
        upload_document_embeddings(file_contents)
        return {"message": "Embeddings uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading embeddings: {e}")


@app.post("/generate-image")
async def generate_image(data: dict):
    """Generate an image based on a text prompt using Pollinations.ai (Free) and store it locally."""
    try:
        prompt = data.get("prompt")
        logger.info(f"Generating image locally for prompt: {prompt}")
        
        # Using Pollinations.ai as a free, no-key text-to-image provider
        encoded_prompt = requests.utils.quote(prompt)
        image_url = f"https://pollinations.ai/p/{encoded_prompt}?width=1024&height=1024&seed=42&nologo=true"
        
        response = requests.get(image_url)
        if response.status_code != 200:
            raise Exception(f"Failed to generate image from Pollinations.ai: {response.status_code}")
            
        image_data = response.content
        filename = f"{uuid.uuid4().hex}.png"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as f:
            f.write(image_data)
        
        # Local access URL
        self_url = os.getenv("SELF_URL", "http://localhost:8000")
        local_access_url = f"{self_url}/uploads/{filename}"
        
        return {"image_urls": [local_access_url]}
    except Exception as e:
        logger.error("Error generating image: %s", e)
        raise HTTPException(status_code=500, detail=f"Error generating image: {e}")

@app.post("/save-session")
async def save_session_endpoint(data: dict):
    """Save a game session result."""
    try:
        from ai_backend.db import insert_game_session
        user_id = data.get("user_id")
        results = data.get("results")
        scores = data.get("scores")
        session_id = insert_game_session(user_id, results, scores)
        if session_id:
            return {"status": "success", "session_id": session_id}
        else:
            raise Exception("Failed to save session")
    except Exception as e:
        logger.error(f"Error in save_session_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/session/save")
async def save_detailed_session_endpoint(data: dict):
    """Append-only save for detailed gameplay sessions."""
    try:
        from ai_backend.db import insert_detailed_game_session
        session_id = insert_detailed_game_session(data)
        if not session_id:
            raise Exception("Failed to save detailed session")
        return {"status": "success", "session_id": session_id}
    except Exception as e:
        logger.error(f"Error in save_detailed_session_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session/history")
async def get_session_history_endpoint(user_id: str, limit: int = 50):
    """Retrieve chronological session history for a user."""
    try:
        from ai_backend.db import get_game_sessions
        sessions = get_game_sessions(user_id, limit=limit)
        timeline = list(reversed(sessions))
        return JSONResponse(content=serialize_db_data({
            "user_id": user_id,
            "count": len(timeline),
            "sessions": timeline
        }))
    except Exception as e:
        logger.error(f"Error in get_session_history_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/session/report")
async def get_session_report_endpoint(user_id: str):
    """Return current-vs-previous comparison and trend summary."""
    try:
        from ai_backend.db import aggregate_behavior_from_sessions, get_game_sessions
        sessions = get_game_sessions(user_id, limit=25)
        if not sessions:
            return JSONResponse(content={
                "current_analysis": {},
                "previous_analysis": {},
                "delta": {},
                "ai_summary": "No sessions found yet. Complete a game session to generate your first report."
            })

        current_session = sessions[0]
        previous_sessions = sessions[1:]
        current_analysis = aggregate_behavior_from_sessions([current_session])
        previous_analysis = aggregate_behavior_from_sessions(previous_sessions)

        current_scores = current_analysis.get("average_scores", {})
        prev_scores = previous_analysis.get("average_scores", {})
        delta = {}
        improvements = []
        regressions = []
        for key in sorted(set(list(current_scores.keys()) + list(prev_scores.keys()))):
            cur = current_scores.get(key, 0)
            prev = prev_scores.get(key, 0)
            diff = round(cur - prev, 2)
            delta[key] = diff
            if diff >= 5:
                improvements.append(f"{key} (+{diff})")
            elif diff <= -5:
                regressions.append(f"{key} ({diff})")

        if not previous_sessions:
            ai_summary = "Baseline session captured. Play another session to unlock progression analysis."
        else:
            improved_text = ", ".join(improvements) if improvements else "no major domains"
            regressed_text = ", ".join(regressions) if regressions else "no major domains"
            ai_summary = (
                f"User has improved in {improved_text}, but regressed in {regressed_text}. "
                "Use these changes to adapt task intensity and pacing in the next session."
            )

        return JSONResponse(content=serialize_db_data({
            "current_analysis": current_analysis,
            "previous_analysis": previous_analysis,
            "delta": delta,
            "ai_summary": ai_summary,
        }))
    except Exception as e:
        logger.error(f"Error in get_session_report_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-sessions/{user_id}")
async def get_sessions_endpoint(user_id: str):
    """Retrieve all game sessions for a user."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM game_sessions WHERE user_id = %s ORDER BY created_at DESC;", (user_id,))
            columns = [desc[0] for desc in cur.description]
            sessions = [dict(zip(columns, row)) for row in cur.fetchall()]
        return JSONResponse(content=serialize_db_data(sessions))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving sessions: {e}")

@app.post("/chat/save")
async def save_chat_message_endpoint(data: dict):
    """Save a chat message to history."""
    try:
        from ai_backend.db import insert_chat_message
        user_id = data.get("user_id")
        role = data.get("role")
        content = data.get("content")
        msg_id = insert_chat_message(user_id, role, content)
        if msg_id:
            return {"status": "success", "message_id": msg_id}
        else:
            raise Exception("Failed to save chat message")
    except Exception as e:
        logger.error(f"Error in save_chat_message_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/history/{user_id}")
async def get_chat_history_endpoint(user_id: str):
    """Retrieve chat history for a user."""
    try:
        from ai_backend.db import get_chat_history
        history = get_chat_history(user_id)
        return JSONResponse(content=serialize_db_data(history))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chat history: {e}")

@app.get("/user/dossier/{user_id}")
async def get_user_dossier_endpoint(user_id: str):
    """Retrieve aggregate data (sessions + chat) for AI context."""
    try:
        from ai_backend.db import aggregate_behavior_from_sessions, get_db_connection, get_game_sessions
        sessions = get_game_sessions(user_id, limit=6)
        current_session = sessions[0] if sessions else None
        previous_sessions = sessions[1:] if len(sessions) > 1 else []
        aggregated_behavior = aggregate_behavior_from_sessions(previous_sessions)

        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get last 10 chat messages
            cur.execute("SELECT role, content FROM chat_history WHERE user_id = %s ORDER BY created_at DESC LIMIT 10;", (user_id,))
            chats = cur.fetchall()

        return JSONResponse(content=serialize_db_data({
            "current_session": current_session,
            "previous_sessions": previous_sessions,
            "aggregated_behavior": aggregated_behavior,
            "recent_chat": chats[::-1],
        }))
    except Exception as e:
        logger.error(f"Error in get_user_dossier_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/memoir/{user_id}")
async def get_memoir_endpoint(user_id: str):
    """Retrieve the evolving Master Memoir for a user."""
    try:
        from ai_backend.db import get_user_memoir
        memoir = get_user_memoir(user_id)
        return JSONResponse(content=serialize_db_data(memoir or {"master_summary": "Initial exploration in progress...", "session_count": 0}))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/memoir/save")
async def save_memoir_endpoint(data: dict):
    """Update the cumulative Master Memoir."""
    try:
        from ai_backend.db import upsert_user_memoir
        user_id = data.get("user_id")
        summary = data.get("master_summary")
        if upsert_user_memoir(user_id, summary):
            return {"status": "success"}
        raise Exception("Failed to save memoir")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/session/report/save")
async def save_session_report_endpoint(data: dict):
    """Save a formal cognitive analysis report linked to a session."""
    try:
        from ai_backend.db import save_cognitive_report
        session_id = data.get("session_id")
        user_id = data.get("user_id")
        scores = data.get("scores")
        finding = data.get("ai_finding")
        rid = save_cognitive_report(session_id, user_id, scores, finding)
        if rid: return {"status": "success", "report_id": rid}
        raise Exception("Failed to save report")
    except Exception as e:
        logger.error(f"Error in save_session_report_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/session/reports/{user_id}")
async def get_user_cognitive_reports_endpoint(user_id: str):
    """Retrieve all formal cognitive analysis reports for a user."""
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT id, session_id, user_id, scores_summary, ai_finding, created_at
                FROM cognitive_reports
                WHERE user_id = %s
                ORDER BY created_at DESC;
            """, (user_id,))
            return JSONResponse(content=serialize_db_data(cur.fetchall()))
    except Exception as e:
        logger.error(f"Error in get_user_cognitive_reports_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/migrate")
async def trigger_migration_endpoint():
    """Administrative endpoint to trigger data migration from Neon to Aiven."""
    try:
        from ai_backend.db import migrate_from_old_db
        results = migrate_from_old_db()
        if results:
            return {"status": "success", "migrated_counts": results}
        return {"status": "error", "message": "Migration failed or unnecessary (check logs)"}
    except Exception as e:
        logger.error(f"Error triggering migration: {e}")
        raise HTTPException(status_code=500, detail=str(e))
