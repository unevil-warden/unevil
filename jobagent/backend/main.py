from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.db import get_db, init_db
from backend.models import (
    AgentRun, Application, EmailDraft, EmailThread, Followup, Job,
)
from backend.schemas import ApplicationDecisionIn, ProfileIn, SettingsIn
from backend.config import load_settings, save_settings
from backend.services import gmail_client, job_search, llm
from backend.services.application_drafter import draft_application
from backend.services.inbox_classifier import classify_thread
from backend.services.profile import get_profile, update_profile
from backend.services.reply_drafter import draft_reply
from backend.services.token_estimator import get_usage_summary

app = FastAPI(title="JobAgent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ── Serializers ─────────────────────────────────────────────────────────────

def job_dict(j: Job) -> dict:
    return {
        "id": j.id, "title": j.title, "company": j.company, "location": j.location,
        "url": j.url, "source": j.source, "description": j.description, "salary": j.salary,
        "apply_method": j.apply_method, "apply_email": j.apply_email,
        "match_score": j.match_score, "match_reason": j.match_reason, "status": j.status,
        "discovered_at": j.discovered_at.isoformat() if j.discovered_at else None,
    }


def application_dict(a: Application, job: Job | None = None) -> dict:
    return {
        "id": a.id, "job_id": a.job_id, "status": a.status,
        "draft_cover_letter": a.draft_cover_letter, "draft_notes": a.draft_notes,
        "confidence": a.confidence, "mode": a.mode, "gmail_draft_id": a.gmail_draft_id,
        "decision": a.decision,
        "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
        "job_title": (job.title if job else None),
        "job_company": (job.company if job else None),
        "apply_method": (job.apply_method if job else None),
    }


def thread_dict(t: EmailThread, draft: EmailDraft | None = None) -> dict:
    return {
        "id": t.id, "gmail_thread_id": t.gmail_thread_id, "subject": t.subject,
        "sender": t.sender, "snippet": t.snippet, "body": t.body, "category": t.category,
        "needs_response": t.needs_response, "urgency": t.urgency,
        "related_job_id": t.related_job_id,
        "latest_at": t.latest_at.isoformat() if t.latest_at else None,
        "draft": draft_dict(draft) if draft else None,
    }


def draft_dict(d: EmailDraft) -> dict:
    return {
        "id": d.id, "thread_id": d.thread_id, "draft_text": d.draft_text,
        "status": d.status, "gmail_draft_id": d.gmail_draft_id, "confidence": d.confidence,
        "reason": d.reason, "mode": d.mode,
    }


def followup_dict(f: Followup) -> dict:
    return {
        "id": f.id, "task_text": f.task_text, "direction": f.direction,
        "due_date": f.due_date, "status": f.status, "related_job_id": f.related_job_id,
        "related_thread_id": f.related_thread_id, "confidence": f.confidence,
    }


def _latest_draft(db: Session, thread_id: int) -> EmailDraft | None:
    return (db.query(EmailDraft)
            .filter(EmailDraft.thread_id == thread_id)
            .order_by(EmailDraft.created_at.desc()).first())


# ── Health & dashboard ───────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "anthropic": llm.is_configured(),
        "gmail": gmail_client.status(),
    }


@app.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()
    apps = db.query(Application).all()
    threads = db.query(EmailThread).all()
    followups = db.query(Followup).filter(Followup.status == "open").all()
    return {
        "jobs_found": sum(1 for j in jobs if j.status in ("found", "saved")),
        "jobs_total": len(jobs),
        "applications": {
            "draft": sum(1 for a in apps if a.status == "draft"),
            "submitted": sum(1 for a in apps if a.status == "submitted"),
            "interviewing": sum(1 for a in apps if a.status == "interviewing"),
            "offer": sum(1 for a in apps if a.status == "offer"),
            "rejected": sum(1 for a in apps if a.status == "rejected"),
        },
        "inbox_needs_response": sum(1 for t in threads if t.needs_response),
        "open_followups": len(followups),
        "recent_runs": [
            {"kind": r.kind, "summary": r.summary, "mode": r.mode,
             "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in db.query(AgentRun).order_by(AgentRun.created_at.desc()).limit(5).all()
        ],
    }


# ── Agent actions ────────────────────────────────────────────────────────────

@app.post("/agent/find-jobs")
def agent_find_jobs(db: Session = Depends(get_db)):
    result = job_search.find_jobs()
    created = 0
    for jd in result["jobs"]:
        key = job_search.external_key(jd)
        if db.query(Job).filter(Job.external_key == key).first():
            continue
        db.add(Job(
            title=jd.get("title", "Untitled role"), company=jd.get("company", "Unknown"),
            location=jd.get("location"), url=jd.get("url"), source=jd.get("source", result["mode"]),
            description=jd.get("description"), salary=jd.get("salary"),
            apply_method=jd.get("apply_method", "web"), apply_email=jd.get("apply_email"),
            match_score=int(jd.get("match_score", 0)), match_reason=jd.get("match_reason"),
            external_key=key, status="found",
        ))
        created += 1
    summary = f"Found {created} new job(s) ({result['mode']} mode)."
    db.add(AgentRun(kind="find-jobs", summary=summary, mode=result["mode"], items_created=created))
    db.commit()
    out = {"created": created, "mode": result["mode"], "summary": summary}
    if result.get("error"):
        out["error"] = result["error"]
    return out


@app.post("/agent/scan-inbox")
def agent_scan_inbox(db: Session = Depends(get_db)):
    lookback = load_settings().get("inbox_lookback_days", 14)
    threads = gmail_client.fetch_threads(lookback_days=lookback)
    mode = gmail_client.status()
    created = 0
    for t in threads:
        existing = db.query(EmailThread).filter(
            EmailThread.gmail_thread_id == t["gmail_thread_id"]).first()
        cls = classify_thread(t)
        if existing:
            existing.category = cls["category"]
            existing.needs_response = cls["needs_response"]
            existing.urgency = cls.get("urgency")
            row = existing
        else:
            row = EmailThread(
                gmail_thread_id=t["gmail_thread_id"], subject=t.get("subject"),
                sender=t.get("sender"), snippet=t.get("snippet"), body=t.get("body"),
                category=cls["category"], needs_response=cls["needs_response"],
                urgency=cls.get("urgency"), latest_at=t.get("latest_at"),
                source="gmail" if mode == "connected" else "mock",
            )
            db.add(row)
            created += 1
        # Extract a follow-up if the classifier suggested one (de-duped by text).
        ftext = cls.get("followup_text")
        if ftext and cls.get("followup_direction", "none") != "none":
            db.flush()
            exists = db.query(Followup).filter(
                Followup.task_text == ftext, Followup.related_thread_id == row.id).first()
            if not exists:
                db.add(Followup(task_text=ftext, direction=cls["followup_direction"],
                                related_thread_id=row.id, confidence=cls.get("mode")))
    db.flush()
    # Optionally draft replies right away for anything that needs one.
    auto_drafted = 0
    if load_settings().get("draft_style", {}).get("auto_draft_replies"):
        profile = get_profile()
        pending = db.query(EmailThread).filter(EmailThread.needs_response == True).all()  # noqa: E712
        for t in pending:
            if _latest_draft(db, t.id):
                continue
            result = draft_reply(thread_dict(t), profile)
            gmail_id = gmail_client.create_draft(thread_dict(t), result["draft_text"])
            db.add(EmailDraft(
                thread_id=t.id, draft_text=result["draft_text"], status="draft",
                gmail_draft_id=gmail_id, confidence=result.get("confidence"),
                reason=result.get("reason"), mode=result.get("mode"),
            ))
            auto_drafted += 1

    extra = f", auto-drafted {auto_drafted} repl(ies)" if auto_drafted else ""
    summary = f"Scanned {len(threads)} thread(s), {created} new ({mode}){extra}."
    db.add(AgentRun(kind="scan-inbox", summary=summary, mode=mode, items_created=created))
    db.commit()
    return {"scanned": len(threads), "created": created, "auto_drafted": auto_drafted,
            "mode": mode, "summary": summary}


@app.post("/agent/draft-replies")
def agent_draft_replies(db: Session = Depends(get_db)):
    threads = db.query(EmailThread).filter(EmailThread.needs_response == True).all()  # noqa: E712
    profile = get_profile()
    drafted = 0
    mode = "mock"
    for t in threads:
        if _latest_draft(db, t.id):
            continue
        result = draft_reply(thread_dict(t), profile)
        mode = result.get("mode", mode)
        gmail_id = gmail_client.create_draft(thread_dict(t), result["draft_text"])
        db.add(EmailDraft(
            thread_id=t.id, draft_text=result["draft_text"], status="draft",
            gmail_draft_id=gmail_id, confidence=result.get("confidence"),
            reason=result.get("reason"), mode=result.get("mode"),
        ))
        drafted += 1
    summary = f"Drafted {drafted} repl(ies) ({mode} mode)."
    db.add(AgentRun(kind="draft-replies", summary=summary, mode=mode, items_created=drafted))
    db.commit()
    return {"drafted": drafted, "summary": summary}


# ── Jobs ─────────────────────────────────────────────────────────────────────

@app.get("/jobs")
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.match_score.desc(), Job.discovered_at.desc()).all()
    return [job_dict(j) for j in jobs]


@app.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    return job_dict(j)


@app.post("/jobs/{job_id}/save")
def save_job(job_id: int, db: Session = Depends(get_db)):
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    j.status = "saved"
    db.commit()
    return job_dict(j)


@app.post("/jobs/{job_id}/dismiss")
def dismiss_job(job_id: int, db: Session = Depends(get_db)):
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    j.status = "dismissed"
    db.commit()
    return job_dict(j)


@app.post("/jobs/{job_id}/draft-application")
def job_draft_application(job_id: int, db: Session = Depends(get_db)):
    j = db.get(Job, job_id)
    if not j:
        raise HTTPException(404, "Job not found")
    result = draft_application(job_dict(j), get_profile())
    app_row = Application(
        job_id=j.id, status="draft", draft_cover_letter=result["cover_letter"],
        draft_notes=result.get("notes"), confidence=result.get("confidence"),
        mode=result.get("mode"),
    )
    db.add(app_row)
    if j.status == "found":
        j.status = "saved"
    db.commit()
    return application_dict(app_row, j)


# ── Applications ─────────────────────────────────────────────────────────────

@app.get("/applications")
def list_applications(db: Session = Depends(get_db)):
    apps = db.query(Application).order_by(Application.created_at.desc()).all()
    out = []
    for a in apps:
        out.append(application_dict(a, db.get(Job, a.job_id)))
    return out


@app.post("/applications/{app_id}/approve")
def approve_application(app_id: int, db: Session = Depends(get_db)):
    """Mark applied. For email-apply jobs, create an unsent Gmail draft. Never auto-sends."""
    a = db.get(Application, app_id)
    if not a:
        raise HTTPException(404, "Application not found")
    job = db.get(Job, a.job_id)
    a.status = "submitted"
    a.submitted_at = datetime.utcnow()
    if job:
        job.status = "applied"
    note = "Marked as applied."
    if job and job.apply_method == "email" and job.apply_email:
        gmail_id = gmail_client.create_draft(
            {"sender": job.apply_email, "subject": f"Application — {job.title}", "gmail_thread_id": None},
            a.draft_cover_letter or "",
        )
        a.gmail_draft_id = gmail_id
        note = ("Gmail draft created for review (not sent)." if gmail_id
                else "Email-apply job — review the cover letter and send manually.")
    db.commit()
    return {**application_dict(a, job), "note": note}


# ── Inbox ────────────────────────────────────────────────────────────────────

@app.get("/inbox")
def list_inbox(db: Session = Depends(get_db)):
    threads = db.query(EmailThread).order_by(
        EmailThread.needs_response.desc(), EmailThread.latest_at.desc()).all()
    return [thread_dict(t, _latest_draft(db, t.id)) for t in threads]


@app.get("/inbox/{thread_id}")
def get_thread(thread_id: int, db: Session = Depends(get_db)):
    t = db.get(EmailThread, thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    return thread_dict(t, _latest_draft(db, t.id))


@app.post("/inbox/{thread_id}/draft-reply")
def inbox_draft_reply(thread_id: int, db: Session = Depends(get_db)):
    t = db.get(EmailThread, thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    result = draft_reply(thread_dict(t), get_profile())
    gmail_id = gmail_client.create_draft(thread_dict(t), result["draft_text"])
    d = EmailDraft(
        thread_id=t.id, draft_text=result["draft_text"], status="draft",
        gmail_draft_id=gmail_id, confidence=result.get("confidence"),
        reason=result.get("reason"), mode=result.get("mode"),
    )
    db.add(d)
    db.commit()
    return draft_dict(d)


@app.post("/inbox/{thread_id}/send")
def inbox_send(thread_id: int, db: Session = Depends(get_db)):
    """Send the already-reviewed Gmail draft. The only send path; explicit only."""
    t = db.get(EmailThread, thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    d = _latest_draft(db, t.id)
    if not d:
        raise HTTPException(400, "No draft to send")
    if not d.gmail_draft_id:
        # Mock mode (or Gmail not connected): mark sent locally; nothing left your machine.
        d.status = "sent"
        d.sent_at = datetime.utcnow()
        t.needs_response = False
        db.commit()
        return {**draft_dict(d), "sent": False, "note": "No Gmail connection — marked sent locally only."}
    ok = gmail_client.send_draft(d.gmail_draft_id)
    if ok:
        d.status = "sent"
        d.sent_at = datetime.utcnow()
        t.needs_response = False
    db.commit()
    return {**draft_dict(d), "sent": ok}


# ── Follow-ups ───────────────────────────────────────────────────────────────

@app.get("/followups")
def list_followups(db: Session = Depends(get_db)):
    rows = db.query(Followup).order_by(Followup.status, Followup.created_at.desc()).all()
    return [followup_dict(f) for f in rows]


@app.post("/followups/{followup_id}/complete")
def complete_followup(followup_id: int, db: Session = Depends(get_db)):
    f = db.get(Followup, followup_id)
    if not f:
        raise HTTPException(404, "Follow-up not found")
    f.status = "done"
    db.commit()
    return followup_dict(f)


# ── Settings / profile / usage ───────────────────────────────────────────────

def _redacted_settings() -> dict:
    s = load_settings()
    out = dict(s)
    out["llm_api_key_set"] = bool(s.get("llm_api_key"))
    out.pop("llm_api_key", None)
    return out


@app.get("/settings")
def get_settings():
    return _redacted_settings()


@app.post("/settings")
def post_settings(payload: SettingsIn):
    s = load_settings()
    data = dict(payload.data)
    # Empty string for the key means "leave unchanged" so the UI never wipes it by accident.
    if data.get("llm_api_key", None) in (None, ""):
        data.pop("llm_api_key", None)
    s.update(data)
    save_settings(s)
    return _redacted_settings()


@app.get("/profile")
def get_profile_route():
    return get_profile()


@app.post("/profile")
def post_profile(payload: ProfileIn):
    return update_profile(payload.data)


@app.get("/token-usage")
def token_usage():
    return get_usage_summary()
