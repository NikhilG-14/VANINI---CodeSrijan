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

from backend.db import get_db_connection, upload_embeddings_to_mongo
from backend.logger import CustomFormatter
from backend.schema import FileContent, PostInfo
from backend.utils.common import (load_image_from_url_or_file,
                                  read_files_from_directory,
                                  serialize_db_data)
from backend.utils.embedding import find_top_matches, generate_text_embedding
from backend.utils.regex_ptr import extract_info
from backend.utils.steganography import (decode_text_from_image,
                                         encode_text_in_image)
from backend.utils.text_llm import (create_poem, decompose_user_text,
                                    expand_user_text_using_gemini,
                                    expand_user_text_using_gemma,
                                    text_to_image)
from backend.utils.twitter import send_message_to_twitter

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
UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files to serve images locally
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
        gemini_response = await expand_user_text_using_gemini(concatenated_text)
        gemma_response = await expand_user_text_using_gemma(concatenated_text)
        return {"gemini_response": gemini_response, "gemma_response": gemma_response}
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
        from backend.db import insert_data_into_db
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
        local_url = f"http://localhost:8000/uploads/{filename}"
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
    """Upload embeddings to MongoDB."""
    try:
        file_contents = read_files_from_directory("backend/docs")
        upload_embeddings_to_mongo(file_contents)
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
        local_access_url = f"http://localhost:8000/uploads/{filename}"
        
        return {"image_urls": [local_access_url]}
    except Exception as e:
        logger.error("Error generating image: %s", e)
        raise HTTPException(status_code=500, detail=f"Error generating image: {e}")