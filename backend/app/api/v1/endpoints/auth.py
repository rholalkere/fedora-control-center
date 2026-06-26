from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core import deps, security
from app.core.config import settings
from app.repositories.user import UserRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas import auth as auth_schemas

router = APIRouter()

@router.post("/login", response_model=auth_schemas.Token)
def login_for_access_token(
    request: Request,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = UserRepository.get_by_username(db, form_data.username)
    client_ip = request.client.host if request.client else "unknown"
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        # Log failed login attempt
        AuditLogRepository.create(
            db=db,
            username=form_data.username,
            action="login_failed",
            ip_address=client_ip,
            details="Invalid username or password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        AuditLogRepository.create(
            db=db,
            username=user.username,
            action="login_failed",
            ip_address=client_ip,
            details="Inactive user account"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Log successful login
    AuditLogRepository.create(
        db=db,
        username=user.username,
        action="login_success",
        ip_address=client_ip,
        details="User logged in successfully"
    )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=auth_schemas.UserOut)
def read_users_me(current_user: UserOut = Depends(deps.get_current_user)):
    return current_user

@router.post("/register", response_model=auth_schemas.UserOut)
def register_user(
    request: Request,
    user_in: auth_schemas.UserCreate,
    db: Session = Depends(deps.get_db),
    current_user: UserOut = Depends(deps.get_admin_user)
):
    """
    Register a new user. Only accessible by admins.
    """
    user = UserRepository.get_by_username(db, user_in.username)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    new_user = UserRepository.create(
        db=db,
        username=user_in.username,
        password_plain=user_in.password,
        role=user_in.role
    )

    client_ip = request.client.host if request.client else "unknown"
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="register_user",
        ip_address=client_ip,
        details=f"Created user {new_user.username} with role {new_user.role}"
    )

    return new_user
