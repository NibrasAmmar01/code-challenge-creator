import os
import json
import time
import asyncio
import hashlib
import redis
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache, wraps
from pathlib import Path

import requests
from dotenv import load_dotenv


# ============= ENVIRONMENT LOADING =============
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

parent_env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=parent_env_path)


# ============= REDIS CACHE SETUP =============
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
CACHE_TTL = int(os.getenv("CACHE_TTL", 3600))  # 1 hour default

# Initialize Redis client
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True,
        socket_connect_timeout=2,  # Timeout if Redis is down
        socket_timeout=5
    )
    # Test connection
    redis_client.ping()
    print(f"✅ Redis connected successfully at {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    print(f"⚠️ Redis connection failed (caching disabled): {e}")
    redis_client = None


# ============= CACHE DECORATOR =============
def cache_ai_response(ttl_seconds: int = CACHE_TTL):
    """
    Decorator to cache AI responses in Redis.
    Skips caching if Redis is unavailable.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Skip cache if Redis is not available
            if redis_client is None:
                return func(*args, **kwargs)
            
            # Create cache key from function name and arguments
            # Convert args/kwargs to a consistent string
            key_parts = [func.__name__]
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
            key_string = ":".join(key_parts)
            
            # Create MD5 hash for cache key
            cache_key = f"ai_cache:{hashlib.md5(key_string.encode()).hexdigest()}"
            
            try:
                # Try to get from cache
                cached = redis_client.get(cache_key)
                if cached:
                    print(f"✅ CACHE HIT: {func.__name__} for {args[0] if args else 'unknown'}")
                    return json.loads(cached)
                
                print(f"🔄 CACHE MISS: {func.__name__} - generating new response")
                
            except Exception as e:
                print(f"⚠️ Redis error (proceeding without cache): {e}")
                return func(*args, **kwargs)
            
            # Generate new response
            start_time = time.time()
            result = func(*args, **kwargs)
            generation_time = time.time() - start_time
            print(f"⏱️ Generation took {generation_time:.2f}s")
            
            # Cache the result
            try:
                redis_client.setex(
                    cache_key,
                    ttl_seconds,
                    json.dumps(result, ensure_ascii=False)
                )
                print(f"💾 Cached for {ttl_seconds}s")
            except Exception as e:
                print(f"⚠️ Failed to cache: {e}")
            
            return result
        return wrapper
    return decorator


# ============= OLLAMA CONFIGURATION ============
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

print(f"🦙 Using Ollama with model: {OLLAMA_MODEL}")
print(f"   API URL: {OLLAMA_BASE_URL}")


# ============= OLLAMA CLIENT ===================
# Create session with connection pooling for better performance
session = requests.Session()

# Configure connection pooling
adapter = requests.adapters.HTTPAdapter(
    pool_connections=10,
    pool_maxsize=20,
    max_retries=3
)
session.mount('http://', adapter)
session.mount('https://', adapter)

def call_ollama(prompt: str,
                system_prompt: str = None,
                temperature: float = 0.2,
                max_tokens: int = 1500) -> str:

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_p": 0.9,
            "top_k": 40,
            # Speed optimizations
            "num_ctx": 2048,  # Smaller context window for faster processing
            "num_batch": 512,  # Larger batch size
            "f16_kv": True,    # Use half-precision for speed
        }
    }

    if system_prompt:
        payload["system"] = system_prompt

    # Use session with connection pooling
    response = session.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json=payload,
        timeout=(5, 120)  # Connect timeout 5s, read timeout 120s
    )

    response.raise_for_status()
    return response.json()["response"]


# ============= CONNECTION TEST =================
def test_ollama_connection():
    try:
        response = call_ollama("Say OK in one word", temperature=0.1, max_tokens=5)
        print(f"✅ Ollama connection successful: {response.strip()}")
        return True
    except Exception as e:
        print(f"❌ Ollama connection failed: {e}")
        return False


test_ollama_connection()


# ============= FEW-SHOT EXAMPLE ===============
FEW_SHOT_EXAMPLES = """
Example:
{
    "title": "Detect Duplicate Values",
    "question": "Given an array of integers, write a function that determines whether the array contains duplicate values. The function should return true if any value appears more than once and false otherwise. Which approach is the most time-efficient?",
    "options": [
        "Use two nested loops to compare every pair",
        "Sort the array first, then check adjacent elements",
        "Insert elements into a Set and compare sizes",
        "Use a while loop to scan randomly"
    ],
    "correct_answer_index": 2,
    "explanation": "Using a Set is optimal because insertion and lookup are O(1) on average. By comparing the size of the Set with the original array, we can determine if duplicates exist in linear time. The nested loop approach takes O(n^2) time. Sorting takes O(n log n) time. Therefore, the Set approach is the most efficient overall.",
    "time_complexity": "O(n)",
    "space_complexity": "O(n)"
}
"""


# ============= JSON EXTRACTION =================
def extract_json(text: str) -> Dict[str, Any]:
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        json_str = text[start:end]
        return json.loads(json_str)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON from model output: {e}")


# ============= VALIDATION FUNCTIONS ============

def is_question_valid(question: str) -> bool:
    """
    Enforce:
    - Minimum length
    - Must contain action verbs
    - Must describe input/output
    - Must describe a task
    """
    q = question.lower()
    if len(q.split()) < 40:
        return False

    # Input keywords
    input_keywords = ["given", "array", "string", "list", "integer", "input"]
    output_keywords = ["return", "should", "output", "determine", "find", "calculate"]
    task_keywords = ["write", "implement", "function", "method"]

    if not any(word in q for word in input_keywords):
        return False
    if not any(word in q for word in output_keywords):
        return False
    if not any(word in q for word in task_keywords):
        return False

    # Reject generic/vague titles
    banned_phrases = ["challenge", "concept", "what is", "which of the following describes"]
    if any(phrase in q for phrase in banned_phrases):
        return False

    return True


def is_explanation_sufficient(explanation: str, difficulty: str) -> bool:
    word_count = len(explanation.split())
    if difficulty.lower() == "easy":
        return word_count >= 30
    elif difficulty.lower() == "medium":
        return word_count >= 60
    elif difficulty.lower() == "hard":
        return word_count >= 120
    return True


def validate_structure(data: Dict[str, Any]):
    required_keys = {
        "title",
        "question",
        "options",
        "correct_answer_index",
        "explanation",
        "time_complexity",
        "space_complexity"
    }
    if not required_keys.issubset(data.keys()):
        raise ValueError("Missing required fields")
    if len(data["options"]) != 4:
        raise ValueError("Options must contain exactly 4 items")
    if not isinstance(data["correct_answer_index"], int):
        raise ValueError("correct_answer_index must be integer")


# ============= CHALLENGE GENERATION =============
@cache_ai_response(ttl_seconds=3600)  # Cache for 1 hour
def generate_challenge(topic: str,
                       difficulty: str,
                       sub_topic: str = None) -> Dict[str, Any]:

    system_prompt = """
You are a FAANG-level coding interview question designer.

STRICT RULES:
1. Return ONLY valid JSON.
2. The question MUST:
   - Be a full problem statement.
   - Describe the input clearly.
   - Describe expected output.
   - Include a task to implement.
   - Be at least 3-5 sentences long.
3. The explanation MUST:
   - Fully justify the correct answer.
   - Explain why other options are incorrect.
   - Include algorithmic reasoning.
   - Match difficulty depth.
4. Hard difficulty must feel like a LeetCode editorial.

No text outside JSON.
"""

    user_prompt = f"""
{FEW_SHOT_EXAMPLES}

Create a {difficulty} difficulty multiple-choice coding challenge about {topic}.
{sub_topic if sub_topic else ""}

The question must clearly describe:
- The problem
- The input
- The expected output/behavior

Return ONLY valid JSON in this format:
{{
"title": "",
"question": "",
"options": ["", "", "", ""],
"correct_answer_index": 0,
"explanation": "",
"time_complexity": "",
"space_complexity": ""
}}
"""

    attempts = 4

    for attempt in range(attempts):
        try:
            print(f"🦙 Generating MCQ challenge ({attempt+1}/{attempts})...")

            response_text = call_ollama(
                prompt=user_prompt,
                system_prompt=system_prompt
            )

            challenge_data = extract_json(response_text)

            validate_structure(challenge_data)

            if not is_question_valid(challenge_data["question"]):
                raise ValueError("Question too shallow or incomplete")

            if not is_explanation_sufficient(challenge_data["explanation"], difficulty):
                raise ValueError("Explanation not detailed enough")

            print(f"✅ Generated: {challenge_data['title']}")
            return challenge_data

        except Exception as e:
            print(f"⚠ Attempt {attempt+1} failed: {e}")
            time.sleep(1)

    print("❌ Using fallback challenge.")
    return get_fallback_challenge(topic, difficulty)


# ============= FALLBACK MCQ ========================
def get_fallback_challenge(topic: str,
                           difficulty: str) -> Dict[str, Any]:
    return {
        "title": f"{topic} Concept",
        "question": f"Given a problem related to {topic}, write a function to solve it and describe the expected output. Which approach is generally considered optimal and why?",
        "options": [
            "Brute force approach",
            "Optimized data structure usage",
            "Random guessing",
            "Ignoring constraints"
        ],
        "correct_answer_index": 1,
        "explanation": "An optimized approach that leverages proper data structures typically reduces time complexity and ensures scalability. Brute force solutions often fail for large inputs due to quadratic or exponential time complexity. Therefore, selecting the correct data structure is critical for performance.",
        "time_complexity": "Varies",
        "space_complexity": "Varies"
    }


# ============= HINT GENERATION ========================
@cache_ai_response(ttl_seconds=7200)  # Cache hints for 2 hours
def generate_hint(question: str, options: list, correct_answer: int, 
                  explanation: str, difficulty: str, hint_level: int = 1) -> str:
    """
    Generate a hint for a multiple choice question
    hint_level: 1 = subtle hint, 2 = more specific, 3 = detailed guidance
    """
    
    hint_level_descriptions = {
        1: "a subtle hint that gently points in the right direction without revealing too much",
        2: "a more specific hint that narrows down the options and explains the key concept",
        3: "a detailed hint that explains the approach and why certain approaches are wrong, but don't directly state which is correct"
    }
    
    system_prompt = f"""
You are an expert coding instructor helping students learn by providing helpful hints.
Your hints should be educational and guide thinking without directly giving away the answer.
Make hints appropriate for {difficulty} difficulty level.
"""
    
    # Format options with letters
    formatted_options = "\n".join([f"{chr(65+i)}. {opt}" for i, opt in enumerate(options)])
    
    user_prompt = f"""
Question: {question}

Options:
{formatted_options}

I need {hint_level_descriptions[hint_level]}

The correct answer is option {chr(65+correct_answer)} but DO NOT reveal this directly.
Instead, provide a helpful hint that guides the student to figure it out themselves.

Requirements:
- Keep the hint to 1-3 sentences
- Be encouraging and helpful
- Focus on the key concept or approach
- For level 3, you can explain why certain approaches are wrong
- DO NOT explicitly say which option is correct
"""
    
    try:
        hint = call_ollama(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=200
        )
        return hint.strip()
    except Exception as e:
        print(f"Error generating hint: {e}")
        # Fallback hints based on level
        fallback_hints = {
            1: "Think about the time and space complexity trade-offs in this problem.",
            2: "Consider which data structure would be most efficient for this scenario.",
            3: "Look at the edge cases and constraints - the optimal solution often handles them elegantly."
        }
        return fallback_hints[hint_level]


# ============= ASYNC SUPPORT ===================
async def generate_challenge_async(topic: str, difficulty: str):
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        return await loop.run_in_executor(
            executor,
            generate_challenge,
            topic,
            difficulty
        )


# ============= CODE EXPLANATION GENERATION =============

def generate_explanation(code: str, problem: str = "", language: str = "python") -> Dict[str, Any]:
    """
    Generate an explanation for a piece of code
    """
    system_prompt = """
You are an expert coding instructor. Explain the given code in a clear, educational way.
Break down:
1. What the code does
2. How it works step by step
3. Time and space complexity
4. Any potential improvements
Keep your explanation concise but thorough.
"""

    user_prompt = f"""
Language: {language}
Problem: {problem}

Code: {code}

Please explain this code in detail.
"""

    try:
        explanation = call_ollama(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=500
        )

        return {
            "explanation": explanation.strip(),
            "complexity": {
                "time": "O(n)",  # Would be extracted from AI response in production
                "space": "O(1)"
            },
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return {
            "explanation": "Failed to generate explanation. Please try again.",
            "complexity": {},
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }


# ============= CACHING (LRU fallback) =========================
@lru_cache(maxsize=50)
def generate_challenge_cached(topic: str, difficulty: str) -> str:
    """Legacy LRU cache - kept for backward compatibility"""
    return json.dumps(generate_challenge(topic, difficulty))


# ============= MAIN TEST ======================
if __name__ == "__main__":
    print("=" * 80)
    print("🦙 LLAMA3 CODING CHALLENGE GENERATOR WITH REDIS CACHE")
    print("=" * 80)

    # Test MCQ generation
    print("\n📝 Testing MCQ Generation:")
    challenge = generate_challenge("JavaScript Arrays", "medium")
    print(json.dumps(challenge, indent=2, ensure_ascii=False))
    
    # Test hint generation
    print("\n💡 Testing Hint Generation:")
    hint = generate_hint(
        question=challenge["question"],
        options=challenge["options"],
        correct_answer=challenge["correct_answer_index"],
        explanation=challenge["explanation"],
        difficulty="medium",
        hint_level=1
    )
    print(f"Hint: {hint}")