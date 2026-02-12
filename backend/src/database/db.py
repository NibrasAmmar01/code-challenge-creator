from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from . import models
import json
from typing import Optional, List



def get_challenge_quota(db: Session, user_id: str):
    """Get user's challenge quota"""
    return (db.query(models.ChallengeQuota)
            .filter(models.ChallengeQuota.user_id == user_id)
            .first())

def create_challenge_quota(db: Session, user_id: str, initial_quota: int = 50):
    """Create a new quota for user (default 50 per day)"""
    db_quota = models.ChallengeQuota(
        user_id=user_id,
        quota_remaining=initial_quota
    )
    db.add(db_quota)
    db.commit()
    db.refresh(db_quota)
    return db_quota

def reset_quota_if_needed(db: Session, quota: models.ChallengeQuota):
    """Reset quota if 24 hours have passed since last reset"""
    now = datetime.now()
    if quota and now - quota.last_reset_date > timedelta(hours=24):
        quota.quota_remaining = 50  
        quota.last_reset_date = now
        db.commit()
        db.refresh(quota)
    return quota

def update_quota(db: Session, quota: models.ChallengeQuota, decrement: int = 1):
    """Decrement user's quota"""
    if quota and quota.quota_remaining >= decrement:
        quota.quota_remaining -= decrement
        db.commit()
        db.refresh(quota)
    return quota



def create_challenge(
    db: Session,
    user_id: str,
    title: str,
    difficulty: str,
    question: str,
    options: str,
    correct_answer_index: int,
    explanation: str,
    topic: str,
    time_complexity: Optional[str] = None,
    space_complexity: Optional[str] = None
):
    """
    Create a new challenge in the database
    
    Args:
        db: Database session
        user_id: ID of user creating the challenge
        title: Challenge title
        difficulty: Challenge difficulty (easy, medium, hard)
        question: The challenge question
        options: JSON string of options array
        correct_answer_index: Index of correct answer (0-3)
        explanation: Explanation of the answer
        topic: Programming topic
        time_complexity: Optional Big O notation for time
        space_complexity: Optional Big O notation for space
    """
    db_challenge = models.Challenge(
        difficulty=difficulty,
        created_by=user_id,
        title=title,
        question=question,  
        options=options,
        correct_answer_id=correct_answer_index,  
        explanation=explanation,
        topic=topic,
        time_complexity=time_complexity,
        space_complexity=space_complexity,
        date_created=datetime.now()
    )
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    return db_challenge

def get_user_challenges(db: Session, user_id: str, limit: int = 10, offset: int = 0):
    """Get user's challenge history with pagination"""
    return (db.query(models.Challenge)
            .filter(models.Challenge.created_by == user_id)
            .order_by(models.Challenge.date_created.desc())
            .offset(offset)
            .limit(limit)
            .all())

def get_challenge_by_id(db: Session, challenge_id: int, user_id: str):
    """Get a specific challenge by ID"""
    return (db.query(models.Challenge)
            .filter(
                models.Challenge.id == challenge_id,
                models.Challenge.created_by == user_id
            )
            .first())

def delete_challenge(db: Session, challenge_id: int, user_id: str):
    """Delete a challenge"""
    challenge = get_challenge_by_id(db, challenge_id, user_id)
    if challenge:
        db.delete(challenge)
        db.commit()
        return True
    return False

def get_all_user_challenges_count(db: Session, user_id: str):
    """Get total count of user's challenges"""
    return db.query(models.Challenge).filter(models.Challenge.created_by == user_id).count()



def serialize_options(options_list: list) -> str:
    """Convert options list to JSON string for storage"""
    return json.dumps(options_list)

def deserialize_options(options_json: str) -> list:
    """Convert JSON string back to options list"""
    try:
        return json.loads(options_json) if options_json else []
    except:
        return []



def get_user_statistics(db: Session, user_id: str):
    """Get user's challenge statistics"""
    total_challenges = get_all_user_challenges_count(db, user_id)
    quota = get_challenge_quota(db, user_id)
    
    # Get challenges by difficulty
    easy_count = db.query(models.Challenge).filter(
        models.Challenge.created_by == user_id,
        models.Challenge.difficulty == "easy"
    ).count()
    
    medium_count = db.query(models.Challenge).filter(
        models.Challenge.created_by == user_id,
        models.Challenge.difficulty == "medium"
    ).count()
    
    hard_count = db.query(models.Challenge).filter(
        models.Challenge.created_by == user_id,
        models.Challenge.difficulty == "hard"
    ).count()
    
    return {
        "total_challenges": total_challenges,
        "by_difficulty": {
            "easy": easy_count,
            "medium": medium_count,
            "hard": hard_count
        },
        "quota_remaining": quota.quota_remaining if quota else 0,
        "quota_total": 50  
    }



def get_recent_challenges(db: Session, user_id: str, days: int = 7):
    """Get challenges from last N days"""
    cutoff_date = datetime.now() - timedelta(days=days)
    return (db.query(models.Challenge)
            .filter(
                models.Challenge.created_by == user_id,
                models.Challenge.date_created >= cutoff_date
            )
            .order_by(models.Challenge.date_created.desc())
            .all())



def search_challenges(db: Session, user_id: str, search_term: str):
    """Search challenges by title or topic"""
    return (db.query(models.Challenge)
            .filter(
                models.Challenge.created_by == user_id,
                (models.Challenge.title.ilike(f"%{search_term}%") |
                 models.Challenge.topic.ilike(f"%{search_term}%") |
                 models.Challenge.difficulty.ilike(f"%{search_term}%"))
            )
            .order_by(models.Challenge.date_created.desc())
            .all())



def create_challenges_bulk(db: Session, user_id: str, challenges_data: list):
    """Create multiple challenges at once"""
    created_challenges = []
    for data in challenges_data:
        challenge = create_challenge(
            db=db,
            user_id=user_id,
            title=data.get('title'),
            difficulty=data.get('difficulty'),
            question=data.get('question'),
            options=serialize_options(data.get('options', [])),
            correct_answer_index=data.get('correct_answer_index', 0),
            explanation=data.get('explanation'),
            topic=data.get('topic'),
            time_complexity=data.get('time_complexity'),
            space_complexity=data.get('space_complexity')
        )
        created_challenges.append(challenge)
    return created_challenges

def delete_all_user_challenges(db: Session, user_id: str):
    """Delete all challenges for a user (use with caution)"""
    deleted = db.query(models.Challenge).filter(
        models.Challenge.created_by == user_id
    ).delete(synchronize_session=False)
    db.commit()
    return deleted