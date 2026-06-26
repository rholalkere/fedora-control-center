from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import get_password_hash

class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def create(db: Session, username: str, password_plain: str, role: str = "viewer") -> User:
        hashed_password = get_password_hash(password_plain)
        db_user = User(
            username=username,
            hashed_password=hashed_password,
            role=role,
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def update_password(db: Session, user: User, password_plain: str) -> User:
        user.hashed_password = get_password_hash(password_plain)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_role(db: Session, user: User, role: str) -> User:
        user.role = role
        db.commit()
        db.refresh(user)
        return user
