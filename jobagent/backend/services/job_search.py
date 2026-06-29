"""Find jobs that match the user's profile.

LLM mode: Claude with the server-side web_search tool returns a structured list
of real postings. Mock mode (no API key): deterministic synthetic postings built
from the profile so the app is fully usable offline.
"""
import hashlib

from backend.config import load_settings
from backend.services import llm
from backend.services.profile import get_profile, profile_summary_text

JOB_SCHEMA = {
    "type": "object",
    "properties": {
        "jobs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "company": {"type": "string"},
                    "location": {"type": "string"},
                    "url": {"type": "string"},
                    "source": {"type": "string"},
                    "description": {"type": "string"},
                    "salary": {"type": "string"},
                    "apply_method": {"type": "string", "enum": ["web", "email"]},
                    "apply_email": {"type": "string"},
                    "match_score": {"type": "integer"},
                    "match_reason": {"type": "string"},
                },
                "required": ["title", "company", "match_score", "match_reason"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["jobs"],
    "additionalProperties": False,
}


def external_key(job: dict) -> str:
    raw = (job.get("url") or f"{job.get('company','')}-{job.get('title','')}").strip().lower()
    return hashlib.sha1(raw.encode()).hexdigest()[:24]


def _mock_jobs(profile: dict, limit: int) -> list[dict]:
    roles = profile.get("target_roles") or ["Software Engineer"]
    locations = profile.get("target_locations") or ["Remote"]
    skills = profile.get("skills") or ["Python"]
    companies = [
        ("Aperture Labs", "web", None, "$150k–$185k"),
        ("Northwind Software", "email", "jobs@northwind.example", "$140k–$170k"),
        ("Lumen Health", "web", None, "$135k–$165k"),
        ("Cedar & Co", "web", None, "competitive"),
        ("Brightwave", "email", "careers@brightwave.example", "$160k–$200k"),
        ("Tessellate AI", "web", None, "$170k–$210k"),
    ]
    jobs = []
    for i in range(min(limit, len(companies) * len(roles))):
        role = roles[i % len(roles)]
        company, method, email, salary = companies[i % len(companies)]
        loc = locations[i % len(locations)]
        skill = skills[i % len(skills)]
        score = 90 - (i * 4) % 45
        jobs.append({
            "title": role,
            "company": company,
            "location": loc,
            "url": f"https://example.com/jobs/{company.lower().replace(' ', '-').replace('&','and')}/{i}",
            "source": "mock",
            "description": f"{company} is hiring a {role} ({loc}). Strong match on {skill}. "
                           "This is sample data — add an Anthropic API key to search real listings.",
            "salary": salary,
            "apply_method": method,
            "apply_email": email,
            "match_score": int(score),
            "match_reason": f"Targets your '{role}' goal in {loc}; uses {skill}.",
        })
    return jobs


def find_jobs() -> dict:
    profile = get_profile()
    limit = load_settings().get("max_jobs_per_search", 12)

    if not llm.is_configured():
        return {"mode": "mock", "jobs": _mock_jobs(profile, limit)}

    system = (
        "You are a job-search assistant. Use web search to find current, real job "
        "postings that fit the candidate. Only return postings you actually found "
        "via search, with working URLs. Score each 0-100 for fit and explain why in "
        "one sentence. Never invent listings."
    )
    user = (
        f"Candidate profile:\n{profile_summary_text(profile)}\n\n"
        f"Find up to {limit} strong-fit, currently-open roles. Prefer the candidate's "
        "target roles and locations and respect the minimum salary where stated."
    )
    try:
        result = llm.web_search_json("job_search", system, user, JOB_SCHEMA)
        jobs = result.get("jobs", [])[:limit]
        for j in jobs:
            j.setdefault("apply_method", "web")
            j.setdefault("source", "web")
        return {"mode": "llm", "jobs": jobs}
    except Exception as e:
        out = {"mode": "mock", "jobs": _mock_jobs(profile, limit)}
        out["error"] = f"LLM search failed ({e}); showing sample data."
        return out
