from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.db import (
    get_challenge_quota,
    create_challenge,
    create_challenge_quota,
    reset_quota_if_needed,
    get_user_challenges
)
from ..utils import authenticate_and_get_user_details
from ..database.models import get_db
from ..ai_generator import generate_challenge as ai_generate_challenge
import json
from datetime import datetime
from typing import Optional, List
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ChallengeRequest(BaseModel):
    topic: str
    difficulty: str
    sub_topic: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "topic": "Python lists",
                "difficulty": "easy",
                "sub_topic": "list comprehension"
            }
        }

class ChallengeResponse(BaseModel):
    id: Optional[int] = None
    title: str
    question: str
    options: List[str]
    correct_answer_index: int
    explanation: str
    difficulty: str
    topic: str
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None
    generated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.post("/generate-challenge", response_model=ChallengeResponse)
async def generate_challenge(
    request: ChallengeRequest, 
    db: Session = Depends(get_db)
):
    """
    Generate a new coding challenge using AI
    """
    try:
        # Authenticate user
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get("user_id")
        logger.info(f"User {user_id} requesting challenge: {request.topic} ({request.difficulty})")

        # Get or create quota
        quota = get_challenge_quota(db, user_id)
        if not quota:
            quota = create_challenge_quota(db, user_id)
            logger.info(f"Created new quota for user {user_id}")

        # Check and reset quota if needed
        quota = reset_quota_if_needed(db, quota)

        # Check if user has quota remaining
        if quota.quota_remaining <= 0:
            logger.warning(f"User {user_id} quota exhausted")
            raise HTTPException(
                status_code=429, 
                detail="Daily challenge quota exhausted. Please try again tomorrow."
            )
        
        # Generate challenge using AI
        try:
            challenge_data = ai_generate_challenge(
                topic=request.topic,
                difficulty=request.difficulty,
                sub_topic=request.sub_topic
            )
            logger.info(f"Successfully generated challenge for user {user_id}")
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            raise HTTPException(
                status_code=503,
                detail="Challenge generation service temporarily unavailable. Please try again later."
            )
        
        # Save challenge to database
        db_challenge = create_challenge(
            db=db,
            user_id=user_id,
            title=challenge_data.get("title", f"{request.topic} Challenge"),
            difficulty=request.difficulty,
            question=challenge_data.get("question", ""),
            options=json.dumps(challenge_data.get("options", [])),
            correct_answer_index=challenge_data.get("correct_answer_index", 0),
            explanation=challenge_data.get("explanation", ""),
            topic=request.topic,
            time_complexity=challenge_data.get("time_complexity"),
            space_complexity=challenge_data.get("space_complexity")
        )
        
        # Decrement quota
        quota.quota_remaining -= 1
        db.commit()
        
        logger.info(f"User {user_id} quota remaining: {quota.quota_remaining}")
        
        # Prepare response
        response = ChallengeResponse(
            id=db_challenge.id,
            title=challenge_data.get("title", f"{request.topic} Challenge"),
            question=challenge_data.get("question", ""),
            options=challenge_data.get("options", []),
            correct_answer_index=challenge_data.get("correct_answer_index", 0),
            explanation=challenge_data.get("explanation", ""),
            difficulty=request.difficulty,
            topic=request.topic,
            time_complexity=challenge_data.get("time_complexity"),
            space_complexity=challenge_data.get("space_complexity"),
            generated_at=challenge_data.get("generated_at", datetime.now().isoformat())
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate_challenge: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-history")
async def my_history(
    request: Request, 
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """
    Get user's challenge history
    """
    try:
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get("user_id")
        logger.info(f"Fetching history for user {user_id}")

        challenges = get_user_challenges(db, user_id, limit=limit, offset=offset)
        
        # Format challenges for response
        formatted_challenges = []
        for challenge in challenges:
            try:
                options = json.loads(challenge.options) if challenge.options else []
            except:
                options = []
                
            formatted_challenges.append({
                "id": challenge.id,
                "title": challenge.title,
                "question": challenge.question,
                "options": options,
                "correct_answer_index": challenge.correct_answer_index,
                "explanation": challenge.explanation,
                "difficulty": challenge.difficulty,
                "topic": challenge.topic,
                "time_complexity": challenge.time_complexity,
                "space_complexity": challenge.space_complexity,
                "date_created": challenge.date_created.isoformat() if challenge.date_created else None
            })
        
        return {
            "user_id": user_id,
            "total": len(formatted_challenges),
            "challenges": formatted_challenges
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/quota")
async def get_quota(
    request: Request, 
    db: Session = Depends(get_db)
):
    """
    Get user's current quota information
    """
    try:
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get("user_id")
        logger.info(f"Fetching quota for user {user_id}")

        quota = get_challenge_quota(db, user_id)
        
        if not quota:
            # Create default quota if doesn't exist
            quota = create_challenge_quota(db, user_id)
            logger.info(f"Created default quota for user {user_id}")
        
        # Check if quota needs reset
        quota = reset_quota_if_needed(db, quota)
        
        return {
            "user_id": user_id,
            "quota_remaining": quota.quota_remaining,
            "total_quota": 50,  # Default daily quota
            "last_reset_date": quota.last_reset_date.isoformat() if quota.last_reset_date else None,
            "next_reset_date": (quota.last_reset_date.replace(day=quota.last_reset_date.day + 1) 
                              if quota.last_reset_date else None)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quota: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/challenge/{challenge_id}")
async def get_challenge_by_id(
    challenge_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get a specific challenge by ID
    """
    try:
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get("user_id")
        
        from ..database.models import Challenge
        challenge = db.query(Challenge).filter(
            Challenge.id == challenge_id,
            Challenge.created_by == user_id
        ).first()
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        try:
            options = json.loads(challenge.options) if challenge.options else []
        except:
            options = []
        
        return {
            "id": challenge.id,
            "title": challenge.title,
            "question": challenge.question,
            "options": options,
            "correct_answer_index": challenge.correct_answer_index,
            "explanation": challenge.explanation,
            "difficulty": challenge.difficulty,
            "topic": challenge.topic,
            "time_complexity": challenge.time_complexity,
            "space_complexity": challenge.space_complexity,
            "date_created": challenge.date_created.isoformat() if challenge.date_created else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching challenge {challenge_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/validate-answer")
async def validate_answer(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Validate a user's answer to a challenge
    """
    try:
        body = await request.json()
        challenge_id = body.get("challenge_id")
        selected_answer_index = body.get("selected_answer_index")
        
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get("user_id")
        
        from ..database.models import Challenge
        challenge = db.query(Challenge).filter(
            Challenge.id == challenge_id,
            Challenge.created_by == user_id
        ).first()
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        is_correct = (selected_answer_index == challenge.correct_answer_index)
        
        return {
            "is_correct": is_correct,
            "correct_answer_index": challenge.correct_answer_index,
            "explanation": challenge.explanation if not is_correct else "Correct! Well done!",
            "feedback": "Great job!" if is_correct else "Not quite right. Check the explanation below."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating answer: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Optional: Endpoint to generate explanation for code
@router.post("/explain-code")
async def explain_code(
    request: Request
):
    """
    Generate an explanation for a piece of code
    """
    try:
        body = await request.json()
        code = body.get("code")
        problem = body.get("problem", "")
        language = body.get("language", "Python")
        
        user_details = authenticate_and_get_user_details(request)
        user_id = user_details.get("user_id")
        logger.info(f"User {user_id} requesting code explanation")
        
        from ..ai_generator import generate_explanation
        explanation = generate_explanation(code, problem, language)
        
        return {
            "explanation": explanation.get("explanation"),
            "complexity": explanation.get("complexity", {}),
            "generated_at": explanation.get("generated_at")
        }
        
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        raise HTTPException(status_code=400, detail=str(e))