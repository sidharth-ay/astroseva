"""Saved Charts API endpoints."""

from fastapi import Request
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from ..db.database import get_db
from ..db.models import User, SavedChart
from ..services.auth_service import get_current_user

from ..core.rate_limit import limiter
router = APIRouter(prefix="/api/v1/charts", tags=["charts"])


class SaveChartRequest(BaseModel):
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    latitude: float
    longitude: float
    timezone_offset: float
    chart_data: dict


class ChartResponse(BaseModel):
    id: int
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    created_at: str


@router.post("/save")
@limiter.limit("60/minute")
async def save_chart(
    request: Request,
    payload: SaveChartRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a birth chart to user's profile."""
    chart = SavedChart(
        user_id=user.id,
        name=payload.name,
        birth_date=payload.birth_date,
        birth_time=payload.birth_time,
        birth_place=payload.birth_place,
        latitude=payload.latitude,
        longitude=payload.longitude,
        timezone_offset=payload.timezone_offset,
        chart_data=payload.chart_data,
    )
    db.add(chart)
    db.commit()
    db.refresh(chart)

    return {
        "message": "Chart saved successfully",
        "chart_id": chart.id,
    }


@router.get("/list")
@limiter.limit("60/minute")
async def list_charts(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all saved charts for the user."""
    charts = db.query(SavedChart).filter(SavedChart.user_id == user.id).order_by(SavedChart.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(SavedChart).filter(SavedChart.user_id == user.id).count()

    return {
        "charts": [
            {
                "id": c.id,
                "name": c.name,
                "birth_date": c.birth_date,
                "birth_time": c.birth_time,
                "birth_place": c.birth_place,
                "created_at": str(c.created_at),
            }
            for c in charts
        ],
        "total": total,
    }


@router.get("/{chart_id}")
@limiter.limit("60/minute")
async def get_chart(
    request: Request,
    chart_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific saved chart."""
    chart = db.query(SavedChart).filter(
        SavedChart.id == chart_id,
        SavedChart.user_id == user.id,
    ).first()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    return {
        "id": chart.id,
        "name": chart.name,
        "birth_date": chart.birth_date,
        "birth_time": chart.birth_time,
        "birth_place": chart.birth_place,
        "latitude": chart.latitude,
        "longitude": chart.longitude,
        "timezone_offset": chart.timezone_offset,
        "chart_data": chart.chart_data,
        "created_at": str(chart.created_at),
    }


@router.delete("/{chart_id}")
@limiter.limit("60/minute")
async def delete_chart(
    request: Request,
    chart_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved chart."""
    chart = db.query(SavedChart).filter(
        SavedChart.id == chart_id,
        SavedChart.user_id == user.id,
    ).first()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    db.delete(chart)
    db.commit()

    return {"message": "Chart deleted successfully"}
