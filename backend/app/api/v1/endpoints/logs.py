from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from app.core import deps
from app.schemas.journal import JournalFilter, LogResponse
from app.services.journal import JournalService
import io

router = APIRouter()

@router.post("/query", response_model=LogResponse, dependencies=[Depends(deps.get_current_user)])
def query_journal_logs(filters: JournalFilter):
    return JournalService.get_logs(filters)

@router.get("/export", dependencies=[Depends(deps.get_current_user)])
def export_journal_logs(
    service: str = Query(None),
    priority: int = Query(None),
    since: str = Query(None),
    search: str = Query(None),
    limit: int = Query(500)
):
    filters = JournalFilter(
        service=service,
        priority=priority,
        since=since,
        search=search,
        limit=limit
    )
    log_response = JournalService.get_logs(filters)
    
    # Format logs as plain text
    text_stream = io.StringIO()
    for line in log_response.lines:
        text_stream.write(f"[{line.timestamp}] {line.hostname} {line.process}[{line.pid or ''}]: {line.message}\n")
    
    text_stream.seek(0)
    
    # Return as download stream
    response = StreamingResponse(
        io.BytesIO(text_stream.read().encode("utf-8")),
        media_type="text/plain"
    )
    response.headers["Content-Disposition"] = "attachment; filename=journal_export.log"
    return response
