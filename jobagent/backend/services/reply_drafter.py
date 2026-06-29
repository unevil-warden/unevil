"""Draft an email reply to a job-related thread, in the candidate's voice.

LLM mode: one structured Claude call. Mock mode: category-aware templates.
Drafts are never sent automatically — they are stored and (optionally) pushed to
Gmail as an unsent draft for the user to review.
"""
from backend.services import llm
from backend.services.profile import get_profile, profile_summary_text

REPLY_SCHEMA = {
    "type": "object",
    "properties": {
        "draft_reply": {"type": "string"},
        "reason": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
    },
    "required": ["draft_reply", "reason", "confidence"],
    "additionalProperties": False,
}


def _mock_reply(thread: dict, profile: dict) -> dict:
    name = (profile.get("name") or "").split(" ")[0] or "there"
    category = thread.get("category", "other")
    sender = (thread.get("sender") or "").split("<")[0].strip() or "there"

    if category == "interview":
        draft = (f"Hi {sender},\n\nThank you for reaching out — I'd be glad to interview. "
                 "I'm generally available weekday afternoons this week and next; happy to work "
                 "around your schedule. Let me know what times suit you and I'll confirm.\n\n"
                 f"Best,\n{name}")
        reason = "Interview invite — confirms interest and offers availability. Edit the times."
    elif category == "offer":
        draft = (f"Hi {sender},\n\nThank you so much for the offer — I'm genuinely excited. "
                 "I'd like to review the details and follow up with a couple of questions shortly. "
                 "Could you share the full written offer and a deadline for my decision?\n\n"
                 f"Best,\n{name}")
        reason = "Offer — positive, buys time to review. Do not accept/decline until you've read terms."
    elif category == "recruiter":
        draft = (f"Hi {sender},\n\nThanks for reaching out — the role sounds interesting and I'm open "
                 "to learning more. A quick summary of what I'm looking for: "
                 f"{profile.get('preferences','product-focused, remote-friendly teams')}. "
                 "Would a short call this week work?\n\n"
                 f"Best,\n{name}")
        reason = "Recruiter outreach — expresses measured interest and surfaces your preferences."
    else:
        draft = (f"Hi {sender},\n\nThanks for the note — following up to keep this moving. "
                 "Let me know if you need anything else from me.\n\n"
                 f"Best,\n{name}")
        reason = "Generic placeholder — add specifics before sending."

    return {"draft_text": draft, "reason": reason, "confidence": "low", "mode": "mock"}


def draft_reply(thread: dict, profile: dict | None = None) -> dict:
    profile = profile or get_profile()
    if not llm.is_configured():
        return _mock_reply(thread, profile)

    system = (
        "You draft email replies for a job seeker, in their voice — warm, concise, "
        "professional, no fluff. Never accept or decline an offer outright; keep options "
        "open and ask for what's needed. Output a ready-to-edit draft."
    )
    user = (
        f"Candidate:\n{profile_summary_text(profile)}\n\n"
        f"Thread category: {thread.get('category','other')}\n"
        f"From: {thread.get('sender','')}\n"
        f"Subject: {thread.get('subject','')}\n\n"
        f"Message:\n{thread.get('body') or thread.get('snippet','')}\n\n"
        "Write the reply."
    )
    try:
        result = llm.structured_call("reply_draft", system, user, REPLY_SCHEMA,
                                     max_tokens=700, expected_output_tokens=250)
        return {
            "draft_text": result["draft_reply"],
            "reason": result.get("reason", ""),
            "confidence": result.get("confidence", "medium"),
            "mode": "llm",
        }
    except Exception:
        return _mock_reply(thread, profile)
