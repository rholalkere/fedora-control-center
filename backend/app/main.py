import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.v1.router import api_router
from app.repositories.user import UserRepository

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fedora_control_center")

# Initialize database tables on startup (simplifies SQLite bootstrap)
try:
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {str(e)}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Web administration dashboard for Fedora Workstation and Fedora Server",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def run_security_checks():
    logger.info("Performing startup security checks...")
    if settings.SECRET_KEY == "supersecretkey_change_me_in_production":
        logger.warning(
            "SECURITY WARNING: SECRET_KEY is set to the default developer key! "
            "Please change this in your '.env' file before deploying in production."
        )

@app.on_event("startup")
def create_default_admin():
    db = SessionLocal()
    try:
        admin_user = UserRepository.get_by_username(db, "admin")
        if not admin_user:
            logger.info("No admin user found. Creating default administrator...")
            UserRepository.create(
                db=db,
                username="admin",
                password_plain="fedora",
                role="admin"
            )
            logger.warning("SECURITY WARNING: Default administrator created (username: admin, password: fedora). Change your password in Settings immediately.")
        else:
            logger.info("Administrator account verified.")
            from app.core import security
            if security.verify_password("fedora", admin_user.hashed_password):
                logger.warning(
                    "SECURITY WARNING: Administrator account is still using the default password 'fedora'! "
                    "Change your password in Settings immediately to secure the system."
                )
    except Exception as e:
        logger.error(f"Failed to verify/create default admin: {str(e)}")
    finally:
        db.close()

@app.on_event("startup")
def start_network_monitor():
    import threading
    import time
    def daemon_loop():
        time.sleep(5)
        logger.info("Starting background Network Monitor daemon...")
        while True:
            db = SessionLocal()
            try:
                from app.services.network import NetworkService
                NetworkService.run_monitor_tick(db)
            except Exception as e:
                logger.error(f"Error in network monitor daemon: {str(e)}")
            finally:
                db.close()
            time.sleep(30)
            
    thread = threading.Thread(target=daemon_loop, daemon=True)
    thread.start()

@app.get("/")
def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "docs": "/docs"
    }
