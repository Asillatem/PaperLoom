from sqlmodel import SQLModel, Session, create_engine
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./paperloom.db")

# SQLite needs check_same_thread=False for FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def create_db_and_tables():
    """Create all tables defined in models.py"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency for FastAPI routes to get a database session"""
    with Session(engine) as session:
        yield session
