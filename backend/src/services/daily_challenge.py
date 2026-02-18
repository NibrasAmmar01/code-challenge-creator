from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any
import random
import logging
import json

from ..database import models
from ..ai_generator import generate_challenge

logger = logging.getLogger(__name__)


class DailyChallengeService:

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_today_challenge(self) -> models.DailyChallenge:
        """Get today's daily challenge, or create if it doesn't exist"""
        today = date.today()

        daily = self.db.query(models.DailyChallenge).filter(
            models.DailyChallenge.date == today
        ).first()

        if daily:
            return daily

        return self._create_daily_challenge(today)

    def _create_daily_challenge(self, challenge_date: date) -> models.DailyChallenge:
        """Create a new daily challenge"""

        topics = [
            "Python lists", "JavaScript arrays", "SQL queries",
            "React hooks", "Algorithms", "Data structures",
            "Python dictionaries", "JavaScript promises", "Database design",
            "Object-oriented programming", "Functional programming", "Recursion"
        ]

        topic_index = challenge_date.day % len(topics)
        topic = topics[topic_index]

        try:
            challenge_data = generate_challenge(
                topic=topic,
                difficulty="medium"
            )
        except Exception as e:
            logger.error(f"Failed to generate daily challenge: {e}")
            return self._get_random_existing_challenge(challenge_date)

        from ..database.db import create_challenge

        challenge = create_challenge(
            db=self.db,
            user_id="system",
            title=challenge_data["title"],
            difficulty="medium",
            question=challenge_data["question"],
            options=json.dumps(challenge_data["options"]),
            correct_answer_index=challenge_data["correct_answer_index"],
            explanation=challenge_data["explanation"],
            topic=topic,
            time_complexity=challenge_data.get("time_complexity"),
            space_complexity=challenge_data.get("space_complexity")
        )

        daily = models.DailyChallenge(
            challenge_id=challenge.id,
            date=challenge_date,
            featured=True
        )

        self.db.add(daily)
        self.db.commit()
        self.db.refresh(daily)

        return daily

    def _get_random_existing_challenge(self, challenge_date: date) -> models.DailyChallenge:
        """Fallback: use a random existing challenge"""

        challenge = self.db.query(models.Challenge).order_by(
            func.random()
        ).first()

        if not challenge:
            raise Exception("No challenges available in database")

        daily = models.DailyChallenge(
            challenge_id=challenge.id,
            date=challenge_date,
            featured=False
        )

        self.db.add(daily)
        self.db.commit()
        self.db.refresh(daily)

        return daily

    def get_user_daily_status(self, user_id: str) -> Dict[str, Any]:
        """Get user's daily challenge status"""
        today = date.today()
        daily = self.get_or_create_today_challenge()
        
        # Get the actual challenge
        challenge = self.db.query(models.Challenge).get(daily.challenge_id)
        
        if not challenge:
            return {
                "error": "Challenge not found",
                "daily_challenge": {
                    "id": daily.id,
                    "challenge_id": daily.challenge_id,
                    "date": daily.date.isoformat()
                },
                "streak": 0,
                "can_attempt": False
            }
        
        # Format challenge for response
        options = json.loads(challenge.options) if challenge.options else []
        
        # Check if user already completed today's challenge
        user_daily = self.db.query(models.UserDailyChallenge).filter(
            models.UserDailyChallenge.user_id == user_id,
            models.UserDailyChallenge.daily_challenge_id == daily.id
        ).first()
        
        # Get user's streak
        streak = self._calculate_streak(user_id)
        
        return {
            "daily_challenge": {
                "id": daily.id,
                "challenge_id": daily.challenge_id,
                "date": daily.date.isoformat(),
                "completed": user_daily is not None and user_daily.completed,
                "correct": user_daily.correct if user_daily else None,
                "streak_bonus": user_daily.streak_bonus if user_daily else 0
            },
            "challenge": {
                "id": challenge.id,
                "title": challenge.title,
                "question": challenge.question,
                "options": options,
                "explanation": challenge.explanation,
                "difficulty": challenge.difficulty,
                "topic": challenge.topic,
                "time_complexity": challenge.time_complexity,
                "space_complexity": challenge.space_complexity
            },
            "streak": streak,
            "can_attempt": user_daily is None or not user_daily.completed
        }

    def complete_daily_challenge(self, user_id: str, daily_challenge_id: int,
                                is_correct: bool) -> Dict[str, Any]:
        """Mark daily challenge as completed for user"""

        user_daily = self.db.query(models.UserDailyChallenge).filter(
            models.UserDailyChallenge.user_id == user_id,
            models.UserDailyChallenge.daily_challenge_id == daily_challenge_id
        ).first()

        if not user_daily:
            user_daily = models.UserDailyChallenge(
                user_id=user_id,
                daily_challenge_id=daily_challenge_id
            )
            self.db.add(user_daily)

        if user_daily.completed:
            return {
                "success": False,
                "message": "Already completed today's challenge"
            }

        streak = self._calculate_streak(user_id)
        streak_bonus = self._calculate_streak_bonus(streak, is_correct)

        user_daily.completed = True
        user_daily.completed_at = datetime.now()
        user_daily.correct = is_correct
        user_daily.streak_bonus = streak_bonus

        self.db.commit()

        self._update_user_streak(user_id, is_correct)

        return {
            "success": True,
            "message": "Daily challenge completed!",
            "is_correct": is_correct,
            "streak_bonus": streak_bonus,
            "new_streak": streak + 1 if is_correct else 1
        }

    def _calculate_streak(self, user_id: str) -> int:
        """Calculate user's current daily challenge streak"""

        thirty_days_ago = date.today() - timedelta(days=30)

        completions = self.db.query(models.UserDailyChallenge).join(
            models.DailyChallenge
        ).filter(
            models.UserDailyChallenge.user_id == user_id,
            models.UserDailyChallenge.completed == True,
            models.UserDailyChallenge.correct == True,
            models.DailyChallenge.date >= thirty_days_ago
        ).order_by(
            models.DailyChallenge.date.desc()
        ).all()

        if not completions:
            return 0

        streak = 1
        last_date = completions[0].daily_challenge.date

        for completion in completions[1:]:
            current_date = completion.daily_challenge.date
            if (last_date - current_date).days == 1:
                streak += 1
                last_date = current_date
            else:
                break

        return streak

    def _calculate_streak_bonus(self, streak: int, is_correct: bool) -> int:
        """Calculate bonus points based on streak"""

        if not is_correct:
            return 0

        base_bonus = 10
        streak_multiplier = min(streak // 7, 5)
        return base_bonus * (1 + streak_multiplier)

    def _update_user_streak(self, user_id: str, is_correct: bool):
        """Update user's streak in UserStats (if you have that table)"""
        pass