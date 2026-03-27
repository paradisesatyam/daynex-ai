"""
auth_utils.py
Shared helper imported by tasks.py, ai_chat.py, etc.
so they can use  Depends(get_current_user)  without
importing from routes/auth.py (avoids circular imports).
"""
from routes.auth import get_current_user   # re-export

__all__ = ["get_current_user"]
