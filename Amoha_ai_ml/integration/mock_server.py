"""Mock server for AMOHA Green AI analysis endpoint.

Uses FastAPI (already a project dependency) to serve the /analyze endpoint
for Orange frontend integration testing and development.
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import uvicorn

from brain import analyze_care_log

app = FastAPI(
    title="AMOHA Green AI Mock Server",
    description="Mock server for /analyze endpoint",
    version="demo-v0.1",
)


class AnalysisRequest(BaseModel):
    """Request schema for the /analyze endpoint."""

    text: str = Field(..., description="Caregiver-entered care log text.")
    accuracy: float = Field(
        ..., ge=0.0, le=1.0, description="Game accuracy score in [0, 1]."
    )
    behavioral_features: dict = Field(
        default={},
        description="Optional structured behavioral features.",
    )

    @validator("accuracy")
    def accuracy_must_be_valid(cls, v):
        if v < 0 or v > 1:
            raise ValueError("accuracy must be between 0 and 1")
        return v


class AnalysisResponse(BaseModel):
    """Response schema for the /analyze endpoint."""

    tags: list
    suggestions: list
    game_difficulty: dict
    assistance_probability: float
    alert_level: str
    explanation: list
    model_version: str

    model_config = {"protected_namespaces": ()}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(request: AnalysisRequest):
    """Analyze a caregiver care log entry.

    Accepts text and accuracy from Orange frontend and returns
    structured AI analysis results.
    """
    try:
        result = analyze_care_log(
            text=request.text,
            accuracy=request.accuracy,
            behavioral_features=request.behavioral_features or {},
        )
        return AnalysisResponse(
            tags=result["tags"],
            suggestions=result["suggestions"],
            game_difficulty=result["game_difficulty"],
            assistance_probability=result["assistance_probability"],
            alert_level=result["alert_level"],
            explanation=result["explanation"],
            model_version=result["model_version"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "amoha-green-ai-mock"}


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with basic info."""
    return {
        "name": "AMOHA Green AI Mock Server",
        "version": "demo-v0.1",
        "docs": "/docs",
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)