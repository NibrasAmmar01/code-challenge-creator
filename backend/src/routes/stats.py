from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging
import traceback
from collections import Counter

from ..utils import authenticate_and_get_user_details
from ..database.models import get_db
from ..database import models

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stats", tags=["Statistics"])

# ============= Helper Functions =============

def calculate_streak(challenges):
    """Calculate user's current streak"""
    if not challenges:
        return 0
    
    # Extract unique dates and sort
    dates = sorted(list(set([c.date_created.date() for c in challenges])), reverse=True)
    
    if not dates:
        return 0
    
    streak = 1
    current_date = dates[0]
    
    for i in range(1, len(dates)):
        prev_date = dates[i]
        diff = (current_date - prev_date).days
        
        if diff == 1:
            streak += 1
            current_date = prev_date
        elif diff > 1:
            break
    
    return streak

def calculate_achievements(challenges, total, by_difficulty, streak, topic_counter):
    """Calculate user achievements based on activity"""
    achievements = []
    
    # First Challenge
    achievements.append({
        "id": 1,
        "name": "First Challenge",
        "description": "Completed your first challenge",
        "icon": "🎯",
        "unlocked": total >= 1
    })
    
    # Week Warrior
    achievements.append({
        "id": 2,
        "name": "Week Warrior",
        "description": "7-day streak",
        "icon": "🔥",
        "unlocked": streak >= 7,
        "progress": min(streak, 7) if streak < 7 else None,
        "total": 7
    })
    
    # Algorithm Master
    algorithm_count = len([c for c in challenges if "algorithm" in c.topic.lower() or "search" in c.topic.lower() or "sort" in c.topic.lower()])
    achievements.append({
        "id": 3,
        "name": "Algorithm Master",
        "description": "Completed 10 algorithm challenges",
        "icon": "🧮",
        "unlocked": algorithm_count >= 10,
        "progress": min(algorithm_count, 10) if algorithm_count < 10 else None,
        "total": 10
    })
    
    # Python Pro
    python_count = len([c for c in challenges if "python" in c.topic.lower()])
    achievements.append({
        "id": 4,
        "name": "Python Pro",
        "description": "Completed 20 Python challenges",
        "icon": "🐍",
        "unlocked": python_count >= 20,
        "progress": min(python_count, 20) if python_count < 20 else None,
        "total": 20
    })
    
    # JavaScript Ninja
    js_count = len([c for c in challenges if "javascript" in c.topic.lower() or "js" in c.topic.lower()])
    achievements.append({
        "id": 5,
        "name": "JavaScript Ninja",
        "description": "Completed 15 JavaScript challenges",
        "icon": "🟨",
        "unlocked": js_count >= 15,
        "progress": min(js_count, 15) if js_count < 15 else None,
        "total": 15
    })
    
    # Hard Core
    hard_count = by_difficulty.get("hard", 0)
    achievements.append({
        "id": 6,
        "name": "Hard Core",
        "description": "Completed 10 hard challenges",
        "icon": "💪",
        "unlocked": hard_count >= 10,
        "progress": min(hard_count, 10) if hard_count < 10 else None,
        "total": 10
    })
    
    # Century Club
    achievements.append({
        "id": 7,
        "name": "Century Club",
        "description": "Completed 100 challenges",
        "icon": "🎖️",
        "unlocked": total >= 100,
        "progress": min(total, 100) if total < 100 else None,
        "total": 100
    })
    
    # Topic Master (for most practiced topic)
    if topic_counter:
        top_topic, top_count = topic_counter.most_common(1)[0]
        achievements.append({
            "id": 8,
            "name": f"{top_topic} Master",
            "description": f"Completed 10 {top_topic} challenges",
            "icon": "🏆",
            "unlocked": top_count >= 10,
            "progress": min(top_count, 10) if top_count < 10 else None,
            "total": 10
        })
    
    # Speed Demon (placeholder - would need answer time tracking)
    achievements.append({
        "id": 9,
        "name": "Speed Demon",
        "description": "Complete a challenge in under 30 seconds",
        "icon": "⚡",
        "unlocked": False
    })
    
    # Perfectionist (placeholder - would need answer tracking)
    achievements.append({
        "id": 10,
        "name": "Perfectionist",
        "description": "100% success rate on 5 challenges",
        "icon": "🏆",
        "unlocked": False
    })
    
    return achievements

# ============= Stats Endpoints =============

@router.get("")
async def get_user_stats(
    fastapi_request: Request,
    db: Session = Depends(get_db),
    timeframe: str = "all"
):
    """
    Get user statistics for dashboard
    
    - **timeframe**: all, month, week
    """
    try:
        user_details = authenticate_and_get_user_details(fastapi_request)
        user_id = user_details.get("user_id")
        logger.info(f"Fetching stats for user {user_id} with timeframe: {timeframe}")

        # Get all user challenges
        challenges = db.query(models.Challenge).filter(
            models.Challenge.created_by == user_id
        ).all()
        
        # Filter by timeframe
        now = datetime.now()
        if timeframe == "week":
            cutoff = now - timedelta(days=7)
            challenges = [c for c in challenges if c.date_created >= cutoff]
        elif timeframe == "month":
            cutoff = now - timedelta(days=30)
            challenges = [c for c in challenges if c.date_created >= cutoff]
        
        # Total challenges
        total = len(challenges)
        
        # By difficulty
        by_difficulty = {
            "easy": len([c for c in challenges if c.difficulty == "easy"]),
            "medium": len([c for c in challenges if c.difficulty == "medium"]),
            "hard": len([c for c in challenges if c.difficulty == "hard"])
        }
        
        # Success rates (mock data - you'll need to implement answer tracking)
        success_rate = {
            "easy": 85,
            "medium": 62,
            "hard": 41
        }
        
        # Favorite topics
        topic_counter = Counter([c.topic for c in challenges])
        favorite_topics = [
            {"name": topic, "count": count}
            for topic, count in topic_counter.most_common(5)
        ]
        
        # Calculate streak
        streak = calculate_streak(challenges)
        
        # Recent activity (last 7 days)
        recent_activity = []
        for i in range(6, -1, -1):
            date = now - timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            count = len([
                c for c in challenges 
                if c.date_created.strftime("%Y-%m-%d") == date_str
            ])
            recent_activity.append({"date": date_str, "count": count})
        
        # Calculate achievements
        achievements = calculate_achievements(
            challenges, total, by_difficulty, streak, topic_counter
        )
        
        return {
            "totalChallenges": total,
            "byDifficulty": by_difficulty,
            "successRate": success_rate,
            "favoriteTopics": favorite_topics,
            "streak": streak,
            "achievements": achievements,
            "recentActivity": recent_activity
        }
        
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity")
async def get_activity_heatmap(
    fastapi_request: Request,
    db: Session = Depends(get_db),
    days: int = 30
):
    """
    Get activity heatmap data for the last N days
    """
    try:
        user_details = authenticate_and_get_user_details(fastapi_request)
        user_id = user_details.get("user_id")
        
        cutoff = datetime.now() - timedelta(days=days)
        
        challenges = db.query(models.Challenge).filter(
            models.Challenge.created_by == user_id,
            models.Challenge.date_created >= cutoff
        ).all()
        
        # Group by date
        activity = {}
        for challenge in challenges:
            date_str = challenge.date_created.strftime("%Y-%m-%d")
            activity[date_str] = activity.get(date_str, 0) + 1
        
        return activity
        
    except Exception as e:
        logger.error(f"Error fetching activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/streak")
async def get_streak_info(
    fastapi_request: Request,
    db: Session = Depends(get_db)
):
    """
    Get detailed streak information
    """
    try:
        user_details = authenticate_and_get_user_details(fastapi_request)
        user_id = user_details.get("user_id")
        
        challenges = db.query(models.Challenge).filter(
            models.Challenge.created_by == user_id
        ).all()
        
        current_streak = calculate_streak(challenges)
        
        # Calculate longest streak
        if not challenges:
            longest_streak = 0
        else:
            dates = sorted(list(set([c.date_created.date() for c in challenges])))
            longest = 1
            current = 1
            for i in range(1, len(dates)):
                if (dates[i] - dates[i-1]).days == 1:
                    current += 1
                    longest = max(longest, current)
                else:
                    current = 1
            
            longest_streak = longest
        
        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_active_days": len(set([c.date_created.date() for c in challenges]))
        }
        
    except Exception as e:
        logger.error(f"Error fetching streak: {e}")
        raise HTTPException(status_code=500, detail=str(e))