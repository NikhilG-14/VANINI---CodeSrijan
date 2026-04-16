# ProjectX


Steps to start the backend

```
.\.venv\Scripts\Activate  (windows)

pip install -r requirements.txt
fastapi dev ai_backend/main.py

Then open http://127.0.0.1:8000/docs to see the endpoints


pre-commit run --all-files

Render deployment
pip install -r ai_backend/requirements.txt
uvicorn ai_backend.main:app --port 9000 --host 0.0.0.0
```
