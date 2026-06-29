from pydantic import BaseModel


class SettingsIn(BaseModel):
    data: dict


class ProfileIn(BaseModel):
    data: dict


class ApplicationDecisionIn(BaseModel):
    decision: str | None = None
