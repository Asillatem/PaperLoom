from sqlmodel import SQLModel, Session, create_engine

from config import settings

# SQLite needs check_same_thread=False for FastAPI
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)


def create_db_and_tables():
    """Create all tables defined in models.py"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency for FastAPI routes to get a database session"""
    with Session(engine) as session:
        yield session
