from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app import models
from app.routers import user, tires, rides, challenges, settings, auth, events, lab, coach, personal_challenges

models.Base.metadata.create_all(bind=engine)  # fallback si alembic non exécuté

app = FastAPI(
    title="RaceLab API",
    version="1.0.0",
    description="Backend pour RaceLab — pneus, sorties, défis.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(tires.router)
app.include_router(rides.router)
app.include_router(challenges.router)
app.include_router(settings.router)
app.include_router(events.router)
app.include_router(lab.router)
app.include_router(coach.router)
app.include_router(personal_challenges.router)


@app.on_event("startup")
def on_startup():
    from app.database import SessionLocal
    from app.seed import seed
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "service": "RaceLab API"}
