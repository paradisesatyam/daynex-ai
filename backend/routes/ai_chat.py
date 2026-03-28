from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from groq import Groq
from datetime import datetime
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
    tasks = (
        db.query(Task)
        .filter(Task.user_id == user.id)
        .order_by(Task.created.desc())
        .limit(30)
        .all()
    )

    today = datetime.now().strftime("%Y-%m-%d")

    done_tasks    = [t for t in tasks if t.done]
    pending_tasks = [t for t in tasks if not t.done]
    today_tasks   = [t for t in tasks if t.deadline == today]

    def fmt(t):
        return f"• {t.name} [{t.priority} priority, {t.category}, {t.duration}min, deadline: {t.deadline or 'none'}]"

    task_context = f"""
TODAY ({today}):
{chr(10).join(fmt(t) for t in today_tasks) or "No tasks scheduled for today"}

PENDING TASKS ({len(pending_tasks)} total):
{chr(10).join(fmt(t) for t in pending_tasks[:10]) or "No pending tasks"}

COMPLETED ({len(done_tasks)} total):
{chr(10).join(fmt(t) for t in done_tasks[:5]) or "No completed tasks yet"}
"""

    system_prompt = f"""You are Daynex, a sharp and friendly AI productivity coach built into the Daynex app.
The user's name is {user.name}.

Here is their REAL task data:
{task_context}

Your response rules:
- Always use their REAL task names and data — never make up tasks
- Be concise and direct — 2-4 sentences for simple questions
- For plans or schedules, use clear bullet points with specific times
- Be encouraging but honest — tell them if they have too much on their plate
- If asked what to focus on, rank tasks by deadline + priority
- Never say "I don't have access to your tasks" — you have the full list above
- Keep responses under 200 words unless a detailed plan is explicitly asked for
- Use the user's name occasionally to make it personal"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system",  "content": system_prompt},
            {"role": "user",    "content": body.get("message", "")},
        ],
        max_tokens=600,
        temperature=0.7,
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

    prompt = f"""Create a practical, detailed productivity plan for {user.name}.

Goal: {goal}
Timeline: {timeline}
Daily hours available: {hours}
Today's date: {datetime.now().strftime("%Y-%m-%d")}

Format your response exactly like this for each phase:

PHASE 1 — [Week/Days range]: [Phase Title]
Tasks:
• [Specific task 1] (~X hours)
• [Specific task 2] (~X hours)  
• [Specific task 3] (~X hours)
Tip: [One powerful insight for this phase]

---

PHASE 2 — [Week/Days range]: [Phase Title]
...and so on

Make tasks specific and actionable. Include time estimates.
Give 3-4 phases total. End with a motivational one-liner."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0.7,
    )
    return {"plan": response.choices[0].message.content}