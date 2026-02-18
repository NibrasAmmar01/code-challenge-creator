from sqlalchemy import Column, Integer, String, DateTime, create_engine, ForeignKey, UniqueConstraint, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

engine = create_engine('sqlite:///database.db', echo=True)
Base = declarative_base()

class Challenge(Base):
    __tablename__ = 'challenges'

    id = Column(Integer, primary_key=True)
    difficulty = Column(String, nullable=False)
    date_created = Column(DateTime, default=datetime.now)
    created_by = Column(String, nullable=False)
    title = Column(String, nullable=False)
    question = Column(String, nullable=False)  
    options = Column(String, nullable=False)   
    correct_answer_id = Column(Integer, nullable=False)  
    explanation = Column(String, nullable=False)
    topic = Column(String, nullable=False)     
    time_complexity = Column(String, nullable=True)   
    space_complexity = Column(String, nullable=True)  

class ChallengeQuota(Base):
    __tablename__ = 'challenge_quotas'

    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False, unique=True)
    quota_remaining = Column(Integer, nullable=False, default=50)
    last_reset_date = Column(DateTime, default=datetime.now)

class ChallengeBookmark(Base):
    __tablename__ = 'challenge_bookmarks'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False)
    challenge_id = Column(Integer, ForeignKey('challenges.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'challenge_id', name='unique_user_challenge_bookmark'),
    )

# Answer Record table for tracking responses
class AnswerRecord(Base):
    __tablename__ = 'answer_records'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    challenge_id = Column(Integer, ForeignKey('challenges.id'), nullable=False)
    difficulty = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    response_time = Column(Float, nullable=True)  # in seconds
    answered_at = Column(DateTime, default=datetime.now)
    
    # Relationship
    challenge = relationship("Challenge", foreign_keys=[challenge_id])

Base.metadata.create_all(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()