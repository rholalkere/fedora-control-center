import httpx
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.schemas.ai import OllamaModelInfo, OllamaPromptResponse

logger = logging.getLogger("fedora_control_center")

# Mock Ollama models
MOCK_MODELS = [
    OllamaModelInfo(name="llama3.1:8b", size=4700000000, modified_at="2026-06-01T12:00:00Z", parameter_size="8B", quantization_level="Q4_K_M"),
    OllamaModelInfo(name="gemma2:9b", size=5500000000, modified_at="2026-06-03T15:30:00Z", parameter_size="9B", quantization_level="Q4_K_M"),
    OllamaModelInfo(name="mistral:7b", size=4100000000, modified_at="2026-06-05T09:45:00Z", parameter_size="7B", quantization_level="Q4_K_M")
]

class OllamaService:
    @classmethod
    def _get_client(cls) -> httpx.Client:
        return httpx.Client(base_url=settings.OLLAMA_API_URL, timeout=30.0)

    @classmethod
    def list_models(cls) -> List[OllamaModelInfo]:
        try:
            with cls._get_client() as client:
                response = client.get("/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = []
                    for model in data.get("models", []):
                        details = model.get("details", {})
                        models.append(
                            OllamaModelInfo(
                                name=model.get("name"),
                                size=model.get("size"),
                                modified_at=model.get("modified_at"),
                                parameter_size=details.get("parameter_size"),
                                quantization_level=details.get("quantization_level")
                            )
                        )
                    return models
        except httpx.RequestError as e:
            logger.warning(f"Ollama server unreachable at {settings.OLLAMA_API_URL}. Returning mocks.")
            
        return MOCK_MODELS

    @classmethod
    def pull_model(cls, model_name: str) -> bool:
        try:
            with cls._get_client() as client:
                response = client.post("/api/pull", json={"name": model_name, "stream": False}, timeout=120.0)
                return response.status_code == 200
        except httpx.RequestError:
            # Mock success for testing/dev
            MOCK_MODELS.append(
                OllamaModelInfo(
                    name=model_name,
                    size=4500000000,
                    modified_at="Just now",
                    parameter_size="Unknown",
                    quantization_level="Q4_K_M"
                )
            )
            return True

    @classmethod
    def delete_model(cls, model_name: str) -> bool:
        try:
            with cls._get_client() as client:
                response = client.request("DELETE", "/api/delete", json={"name": model_name})
                return response.status_code == 200
        except httpx.RequestError:
            # Mock deletion
            for m in MOCK_MODELS:
                if m.name == model_name:
                    MOCK_MODELS.remove(m)
                    return True
            return False

    @classmethod
    def run_prompt(cls, model: str, prompt: str, system: Optional[str] = None) -> OllamaPromptResponse:
        try:
            with cls._get_client() as client:
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
                if system:
                    payload["system"] = system

                # Set timeout higher for inference
                response = client.post("/api/generate", json=payload, timeout=60.0)
                if response.status_code == 200:
                    data = response.json()
                    return OllamaPromptResponse(
                        response=data.get("response", ""),
                        done=data.get("done", True),
                        total_duration=data.get("total_duration")
                    )
        except httpx.RequestError:
            pass

        # Mock AI completion
        mock_response = (
            f"Hello! I am a simulated response from {model} since the local Ollama server "
            f"is currently unreachable. You asked: '{prompt}'.\n\n"
            "As the Fedora Control Center AI module, I can assist you in running terminal "
            "commands, analyzing journalctl logs for anomalies, and monitoring system hardware metrics."
        )
        return OllamaPromptResponse(
            response=mock_response,
            done=True,
            total_duration=123456789
        )
