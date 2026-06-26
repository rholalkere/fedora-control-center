from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# If SQLite is used, we need check_same_thread=False
connect_args = {}
if settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
