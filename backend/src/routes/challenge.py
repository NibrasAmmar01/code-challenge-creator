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
from ..ai_generator import get_fallback_challenge
import json
from datetime import datetime
from typing import Optional, List
import logging
import traceback

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# ============= Pydantic Models =============

class ChallengeRequest(BaseModel):
    """Request model for generating a challenge"""
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
    """Response model for a challenge"""
    id: Optional[int] = None
    title: str
    question: str
    options: List[str]
    correct_answer_id: int  # Changed from correct_answer_index
    explanation: str
    difficulty: str
    topic: str
    time_complexity: Optional[str] = None
    space_complexity: Optional[str] = None
    generated_at: Optional[str] = None
    
    class Config:
        from_attributes = True
        
class AnswerValidationRequest(BaseModel):
    """Request model for validating an answer"""
    challenge_id: int
    selected_answer_index: int

class AnswerValidationResponse(BaseModel):
    """Response model for answer validation"""
    is_correct: bool
    correct_answer_id: int  # Changed from correct_answer_index
    explanation: str
    feedback: str

class QuotaResponse(BaseModel):
    """Response model for quota information"""
    user_id: str
    quota_remaining: int
    total_quota: int
    last_reset_date: Optional[str] = None
    next_reset_date: Optional[str] = None

# ============= Challenge Endpoints =============

@router.post("/generate-challenge", response_model=ChallengeResponse)
async def generate_challenge(
    challenge_request: ChallengeRequest,
    fastapi_request: Request,
    db: Session = Depends(get_db)
):
    """
    Generate a new coding challenge using AI
    
    - **topic**: Programming topic (e.g., "Python lists", "JavaScript promises")
    - **difficulty**: easy, medium, or hard
    - **sub_topic**: Optional specific sub-topic
    """
    try:
        # Authenticate user using the FastAPI Request object
        user_details = authenticate_and_get_user_details(fastapi_request)
        user_id = user_details.get("user_id")
        logger.info(f"User {user_id} requesting challenge: {challenge_request.topic} ({challenge_request.difficulty})")

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
                topic=challenge_request.topic,
                difficulty=challenge_request.difficulty,
                sub_topic=challenge_request.sub_topic
            )
            logger.info(f"AI successfully generated challenge for user {user_id}")
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            logger.info(f"Using fallback challenge for user {user_id}")
            challenge_data = get_fallback_challenge(
                challenge_request.topic,
                challenge_request.difficulty
            )
        
        # Ensure all required fields exist with defaults
        challenge_data["title"] = challenge_data.get(
            "title",
            f"{challenge_request.topic} {challenge_request.difficulty.capitalize()} Challenge"
        )
        challenge_data["question"] = challenge_data.get(
            "question",
            f"Write a {challenge_request.difficulty} level solution for {challenge_request.topic}."
        )
        challenge_data["options"] = challenge_data.get(
            "options",
            ["Option A", "Option B", "Option C", "Option D"]
        )
        challenge_data["correct_answer_id"] = challenge_data.get("correct_answer_index", 0)  # FIXED: Map to correct_answer_id
        challenge_data["explanation"] = challenge_data.get(
            "explanation",
            f"This is a {challenge_request.difficulty} challenge about {challenge_request.topic}."
        )
        challenge_data["time_complexity"] = challenge_data.get("time_complexity", "O(n)")
        challenge_data["space_complexity"] = challenge_data.get("space_complexity", "O(1)")
        
        # Save challenge to database
        db_challenge = create_challenge(
            db=db,
            user_id=user_id,
            title=challenge_data["title"],
            difficulty=challenge_request.difficulty,
            question=challenge_data["question"],
            options=json.dumps(challenge_data["options"]),
            correct_answer_index=challenge_data["correct_answer_id"],  # FIXED: Pass correct_answer_id
            explanation=challenge_data["explanation"],
            topic=challenge_request.topic,
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
            title=challenge_data["title"],
            question=challenge_data["question"],
            options=challenge_data["options"],
            correct_answer_id=challenge_data["correct_answer_id"],  # FIXED: Use correct_answer_id
            explanation=challenge_data["explanation"],
            difficulty=challenge_request.difficulty,
            topic=challenge_request.topic,
            time_complexity=challenge_data.get("time_complexity"),
            space_complexity=challenge_data.get("space_complexity"),
            generated_at=datetime.now().isoformat()
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate_challenge: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/my-history")
async def my_history(
    fastapi_request: Request,
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """
    Get user's challenge history
    
    - **limit**: Number of challenges to return (default: 10)
    - **offset**: Number of challenges to skip (default: 0)
    """
    try:
        user_details = authenticate_and_get_user_details(fastapi_request)
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
                "correct_answer_id": challenge.correct_answer_id,  # FIXED: Use correct_answer_id
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
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@router.get("/quota", response_model=QuotaResponse)
async def get_quota(
    fastapi_request: Request,
    db: Session = Depends(get_db)
):
    """
    Get user's current quota information
    """
    try:
        user_details = authenticate_and_get_user_details(fastapi_request)
        user_id = user_details.get("user_id")
        logger.info(f"Fetching quota for user {user_id}")

        quota = get_challenge_quota(db, user_id)
        
        if not quota:
            # Create default quota if doesn't exist
            quota = create_challenge_quota(db, user_id)
            logger.info(f"Created default quota for user {user_id}")
        
        # Check if quota needs reset
        quota = reset_quota_if_needed(db, quota)
        
        # Calculate next reset date
        next_reset_date = None
        if quota.last_reset_date:
            next_reset_date = quota.last_reset_date.replace(
                day=quota.last_reset_date.day + 1
            ).isoformat() if quota.last_reset_date else None
        
        return QuotaResponse(
            user_id=user_id,
            quota_remaining=quota.quota_remaining,
            total_quota=50,
            last_reset_date=quota.last_reset_date.isoformat() if quota.last_reset_date else None,
            next_reset_date=next_reset_date
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quota: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching quota: {str(e)}")


@router.get("/challenge/{challenge_id}")
async def get_challenge_by_id(
    challenge_id: int,
    fastapi_request: Request,
    db: Session = Depends(get_db)
):
    """
    Get a specific challenge by ID
    """
    try:
        user_details = authenticate_and_get_user_details(fastapi_request)
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
            "correct_answer_id": challenge.correct_answer_id,  # FIXED: Use correct_answer_id
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
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching challenge: {str(e)}")


@router.post("/validate-answer", response_model=AnswerValidationResponse)
async def validate_answer(
    validation_request: AnswerValidationRequest,
    fastapi_request: Request,
    db: Session = Depends(get_db)
):
    """
    Validate a user's answer to a challenge
    """
    try:
        user_details = authenticate_and_get_user_details(fastapi_request)
        user_id = user_details.get("user_id")
        
        from ..database.models import Challenge
        challenge = db.query(Challenge).filter(
            Challenge.id == validation_request.challenge_id,
            Challenge.created_by == user_id
        ).first()
        
        if not challenge:
            raise HTTPException(status_code=404, detail="Challenge not found")
        
        # FIXED: Use correct_answer_id from the model
        is_correct = (validation_request.selected_answer_index == challenge.correct_answer_id)
        
        return AnswerValidationResponse(
            is_correct=is_correct,
            correct_answer_id=challenge.correct_answer_id,  # FIXED: Use correct_answer_id
            explanation=challenge.explanation if not is_correct else "Correct! Well done!",
            feedback="Great job! 🎉" if is_correct else "Not quite right. Check the explanation below. 💡"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating answer: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error validating answer: {str(e)}")


@router.post("/explain-code")
async def explain_code(
    fastapi_request: Request
):
    """
    Generate an explanation for a piece of code
    """
    try:
        body = await fastapi_request.json()
        code = body.get("code")
        problem = body.get("problem", "")
        language = body.get("language", "Python")
        
        user_details = authenticate_and_get_user_details(fastapi_request)
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
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generating explanation: {str(e)}")