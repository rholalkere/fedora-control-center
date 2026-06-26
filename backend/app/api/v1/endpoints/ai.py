from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core import deps
from app.schemas.ai import OllamaModelList, OllamaModelInfo, OllamaPullRequest, OllamaPromptRequest, OllamaPromptResponse
from app.services.ai import OllamaService
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

@router.get("/models", response_model=OllamaModelList, dependencies=[Depends(deps.get_current_user)])
def list_ai_models():
    models = OllamaService.list_models()
    return OllamaModelList(models=models)

@router.post("/pull")
def pull_ai_model(
    request: Request,
    body: OllamaPullRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="ai_pull_model",
        ip_address=client_ip,
        details=f"Requested Ollama pull for model: {body.name}"
    )

    success = OllamaService.pull_model(body.name)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to pull model: {body.name}")

    return {"status": "success", "message": f"Started pulling model {body.name}"}

@router.delete("/models/{model_name}")
def delete_ai_model(
    model_name: str,
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="ai_delete_model",
        ip_address=client_ip,
        details=f"Requested Ollama delete for model: {model_name}"
    )

    success = OllamaService.delete_model(model_name)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {model_name}")

    return {"status": "success", "message": f"Deleted model {model_name} successfully"}

@router.post("/generate", response_model=OllamaPromptResponse, dependencies=[Depends(deps.get_current_user)])
def generate_ai_response(body: OllamaPromptRequest):
    return OllamaService.run_prompt(body.model, body.prompt, body.system)
