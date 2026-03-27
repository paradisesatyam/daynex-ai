from dotenv import load_dotenv
load_dotenv()                        # must be first — loads .env before anything else

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import auth, tasks, ai_chat

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Daynex API", version="1.0.0")

# Allow frontend (localhost:5173) to talk to backend (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/auth",  tags=["Auth"])
app.include_router(tasks.router,    prefix="/api/tasks", tags=["Tasks"])
app.include_router(ai_chat.router,  prefix="/api/ai",    tags=["AI"])

@app.get("/")
def root():
    return {"message": "Daynex API is running ⚡"}
