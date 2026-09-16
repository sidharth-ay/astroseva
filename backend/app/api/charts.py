"""Saved Charts API endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from ..db.database import get_db
from ..db.models import User, SavedChart
from ..services.auth_service import get_current_user

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
async def save_chart(
    request: SaveChartRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a birth chart to user's profile."""
    chart = SavedChart(
        user_id=user.id,
        name=request.name,
        birth_date=request.birth_date,
        birth_time=request.birth_time,
        birth_place=request.birth_place,
        latitude=request.latitude,
        longitude=request.longitude,
        timezone_offset=request.timezone_offset,
        chart_data=request.chart_data,
    )
    db.add(chart)
    db.commit()
    db.refresh(chart)

    return {
        "message": "Chart saved successfully",
        "chart_id": chart.id,
    }


@router.get("/list")
async def list_charts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all saved charts for the user."""
    charts = db.query(SavedChart).filter(SavedChart.user_id == user.id).order_by(SavedChart.created_at.desc()).all()

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
        "total": len(charts),
    }


@router.get("/{chart_id}")
async def get_chart(
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
async def delete_chart(
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
