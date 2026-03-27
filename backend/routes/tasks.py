from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db
from models import Task
from routes.auth import get_current_user

router = APIRouter()


# ── Pydantic schemas ───────────────────────────────────────
class TaskCreate(BaseModel):
    name:        str
    description: Optional[str] = ""
    deadline:    Optional[str] = ""
    priority:    Optional[str] = "Medium"
    category:    Optional[str] = "General"
    duration:    Optional[int] = 30

class TaskUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    deadline:    Optional[str] = None
    priority:    Optional[str] = None
    category:    Optional[str] = None
    duration:    Optional[int] = None
    notes:       Optional[str] = None

class TaskOut(BaseModel):
    id:          str
    name:        str
    description: Optional[str]
    deadline:    Optional[str]
    priority:    str
    category:    str
    duration:    int
    done:        bool
    active:      bool
    notes:       Optional[str]

    class Config:
        from_attributes = True


# ── GET /api/tasks  — list all tasks for logged-in user ───
@router.get("/", response_model=list[TaskOut])
def get_tasks(
    db:   Session = Depends(get_db),
    user            = Depends(get_current_user),
):
    return (
        db.query(Task)
        .filter(Task.user_id == user.id)
        .order_by(Task.created.desc())
        .all()
    )


# ── POST /api/tasks  — create a new task ──────────────────
@router.post("/", response_model=TaskOut,
             status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    db:   Session = Depends(get_db),
    user            = Depends(get_current_user),
):
    task = Task(
        user_id     = user.id,
        name        = body.name,
        description = body.description,
        deadline    = body.deadline,
        priority    = body.priority,
        category    = body.category,
        duration    = body.duration,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


# ── PUT /api/tasks/{id}  — update a task ──────────────────
@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: str,
    body:    TaskUpdate,
    db:      Session = Depends(get_db),
    user             = Depends(get_current_user),
):
    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


# ── PATCH /api/tasks/{id}/done  — toggle done ─────────────
@router.patch("/{task_id}/done", response_model=TaskOut)
def toggle_done(
    task_id: str,
    db:      Session = Depends(get_db),
    user             = Depends(get_current_user),
):
    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.done   = not task.done
    task.active = False if task.done else task.active
    db.commit()
    db.refresh(task)
    return task


# ── PATCH /api/tasks/{id}/active  — set as current task ───
@router.patch("/{task_id}/active", response_model=TaskOut)
def set_active(
    task_id: str,
    db:      Session = Depends(get_db),
    user             = Depends(get_current_user),
):
    # Clear active flag on all other tasks first
    db.query(Task).filter(
        Task.user_id == user.id, Task.active == True
    ).update({"active": False})

    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.active = True
    db.commit()
    db.refresh(task)
    return task


# ── DELETE /api/tasks/{id}  — delete a task ───────────────
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db:      Session = Depends(get_db),
    user             = Depends(get_current_user),
):
    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
