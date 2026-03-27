import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id       = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email    = Column(String, unique=True, index=True, nullable=False)
    name     = Column(String, nullable=False)
    password = Column(String, nullable=False)
    created  = Column(DateTime, default=datetime.utcnow)

    tasks    = relationship("Task", back_populates="user",
                            cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id     = Column(String, ForeignKey("users.id"), nullable=False)
    name        = Column(String, nullable=False)
    description = Column(Text,    nullable=True, default="")
    deadline    = Column(String,  nullable=True, default="")
    priority    = Column(String,  nullable=False, default="Medium")
    category    = Column(String,  nullable=False, default="General")
    duration    = Column(Integer, nullable=False, default=30)
    done        = Column(Boolean, nullable=False, default=False)
    active      = Column(Boolean, nullable=False, default=False)
    notes       = Column(Text,    nullable=True, default="")
    created     = Column(DateTime, default=datetime.utcnow)

    user        = relationship("User", back_populates="tasks")
