from typing import List, Optional
from pydantic import BaseModel

class OllamaModelInfo(BaseModel):
    name: str
    size: int
    modified_at: str
    parameter_size: Optional[str] = None
    quantization_level: Optional[str] = None

class OllamaModelList(BaseModel):
    models: List[OllamaModelInfo]

class OllamaPullRequest(BaseModel):
    name: str

class OllamaPromptRequest(BaseModel):
    model: str
    prompt: str
    system: Optional[str] = None

class OllamaPromptResponse(BaseModel):
    response: str
    done: bool
    total_duration: Optional[int] = None
