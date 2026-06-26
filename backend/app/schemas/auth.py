from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)
    role: str = Field("viewer", pattern="^(admin|viewer)$")

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
