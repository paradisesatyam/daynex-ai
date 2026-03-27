from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from groq import Groq
import os

from database import get_db
from models import Task
from routes.auth import get_current_user

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ── POST /api/ai/chat ──────────────────────────────────────
@router.post("/chat")
async def chat(
    body: dict,
    db:   Session = Depends(get_db),
    user           = Depends(get_current_user),
):
    # Pull user's tasks as context
    tasks = (
        db.query(Task)
        .filter(Task.user_id == user.id)
        .order_by(Task.created.desc())
        .limit(20)
        .all()
    )
    task_lines = "\n".join([
        f"- {t.name} | {t.priority} priority | "
        f"{'done' if t.done else 'pending'} | {t.category}"
        for t in tasks
    ]) or "No tasks yet."

    system_prompt = f"""You are Daynex, a smart personal productivity AI assistant.
The user's name is {user.name}.
Their current tasks:
{task_lines}

Give concise, actionable, friendly advice. Use their real task data when relevant.
Keep responses under 150 words unless a detailed plan is asked for."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system",  "content": system_prompt},
            {"role": "user",    "content": body.get("message", "")},
        ],
        max_tokens=400,
    )
    return {"reply": response.choices[0].message.content}


# ── POST /api/ai/plan ──────────────────────────────────────
@router.post("/plan")
async def generate_plan(
    body: dict,
    user  = Depends(get_current_user),
):
    goal     = body.get("goal", "")
    timeline = body.get("timeline", "2 weeks")
    hours    = body.get("hours", "2-4 hrs")

    prompt = f"""Create a practical week-by-week productivity plan.

Goal: {goal}
Timeline: {timeline}
Daily hours available: {hours}

Return a JSON array with this exact structure (no markdown, raw JSON only):
[
  {{
    "phase": "Week 1, Mon-Wed",
    "title": "Phase title",
    "tasks": ["task 1", "task 2", "task 3"],
    "tip": "One key insight for this phase"
  }}
]

Return 3-4 phases. Tasks should be specific and actionable."""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800,
    )
    return {"plan": response.choices[0].message.content}
