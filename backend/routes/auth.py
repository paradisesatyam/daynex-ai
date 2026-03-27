from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import httpx
import os

from database import get_db
from models import User

router = APIRouter()

# ── Security config ────────────────────────────────────────
SECRET_KEY    = os.getenv("SECRET_KEY", "change-this-in-production-please")
ALGORITHM     = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI",
                                  "http://localhost:8000/api/auth/google/callback")


# ── Pydantic schemas ───────────────────────────────────────
class SignupRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_name:    str
    user_email:   str

class GoogleCallbackRequest(BaseModel):
    code: str   # authorization code sent from frontend


# ── Helpers ────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(
                         minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


# ── Routes ─────────────────────────────────────────────────

# POST /api/auth/signup
@router.post("/signup", response_model=TokenResponse,
             status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    # Check email already registered
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please log in.")

    user = User(
        name     = body.name,
        email    = body.email,
        password = hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_name=user.name,
        user_email=user.email,
    )


# POST /api/auth/login
@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.")

    token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=token,
        user_name=user.name,
        user_email=user.email,
    )


# GET /api/auth/me  — get logged-in user info
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id":    current_user.id,
        "name":  current_user.name,
        "email": current_user.email,
    }


# ── Google OAuth ───────────────────────────────────────────

# GET /api/auth/google/url  — frontend calls this to get the Google login URL
@router.get("/google/url")
def google_login_url():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500,
            detail="Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env")
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
    )
    return {"url": url}


# POST /api/auth/google/callback  — frontend sends the code here
@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(body: GoogleCallbackRequest,
                          db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500,
            detail="Google OAuth not configured.")

    # Step 1: exchange code for Google tokens
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code":          body.code,
                "client_id":     GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri":  GOOGLE_REDIRECT_URI,
                "grant_type":    "authorization_code",
            },
        )

    if token_res.status_code != 200:
        raise HTTPException(status_code=400,
            detail="Failed to exchange Google code. Try signing in again.")

    google_tokens = token_res.json()
    access_token  = google_tokens.get("access_token")

    # Step 2: fetch user profile from Google
    async with httpx.AsyncClient() as client:
        profile_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if profile_res.status_code != 200:
        raise HTTPException(status_code=400,
            detail="Failed to fetch Google profile.")

    profile = profile_res.json()
    email   = profile.get("email")
    name    = profile.get("name", email.split("@")[0])

    # Step 3: find or create user in DB
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name     = name,
            email    = email,
            password = hash_password(os.urandom(32).hex()),  # random — Google users don't need a password
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Step 4: issue our own JWT
    jwt_token = create_access_token({"sub": user.id})
    return TokenResponse(
        access_token=jwt_token,
        user_name=user.name,
        user_email=user.email,
    )
