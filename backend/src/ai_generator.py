import os
import json
import time
import asyncio
from typing import Dict, Any
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path

import requests
from dotenv import load_dotenv


# ============= ENVIRONMENT LOADING =============
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

parent_env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=parent_env_path)


# ============= OLLAMA CONFIGURATION (FORCED LLAMA3) =============
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = "llama3"

print(f"🦙 Using Ollama with model: {OLLAMA_MODEL}")
print(f"   API URL: {OLLAMA_BASE_URL}")


# ============= OLLAMA CLIENT =============
def call_ollama(prompt: str,
                system_prompt: str = None,
                temperature: float = 0.3,
                max_tokens: int = 800) -> str:
    """Call Ollama API using llama3"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_p": 0.95,
            "top_k": 40
        }
    }

    if system_prompt:
        payload["system"] = system_prompt

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json=payload,
        timeout=(10, 180)  # 10s connect, 180s read
    )

    response.raise_for_status()
    return response.json()["response"]


# ============= CONNECTION TEST =============
def test_ollama_connection():
    try:
        response = call_ollama("Say OK in one word", temperature=0.1, max_tokens=5)
        print(f"✅ Ollama connection successful: {response.strip()}")
        return True
    except Exception as e:
        print(f"❌ Ollama connection failed: {e}")
        return False


test_ollama_connection()


# ============= FEW-SHOT EXAMPLES =============
FEW_SHOT_EXAMPLES = """
Example:
{
    "title": "Binary Search Requirement",
    "question": "What condition must be satisfied before applying binary search?",
    "options": [
        "The array must be sorted",
        "The array must be unsorted",
        "The array must contain duplicates",
        "The array must be reversed"
    ],
    "correct_answer_index": 0,
    "explanation": "Binary search requires sorted data.",
    "time_complexity": "O(log n)",
    "space_complexity": "O(1)"
}
"""


# ============= JSON EXTRACTION =============
def extract_json(text: str) -> Dict[str, Any]:
    """Safely extract JSON object from model output"""

    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        json_str = text[start:end]
        return json.loads(json_str)
    except Exception:
        raise ValueError("Failed to parse JSON from model output")


# ============= CHALLENGE GENERATION =============
def generate_challenge(topic: str,
                       difficulty: str,
                       sub_topic: str = None) -> Dict[str, Any]:

    system_prompt = (
        "You are an expert coding challenge generator. "
        "Return ONLY valid JSON. No explanations outside JSON."
    )

    user_prompt = f"""
{FEW_SHOT_EXAMPLES}

Create a {difficulty} difficulty multiple-choice coding challenge about {topic}.
{sub_topic if sub_topic else ""}

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

    attempts = 2  # 1 retry before fallback

    for attempt in range(attempts):
        try:
            print(f"🦙 Generating challenge ({attempt+1}/{attempts})...")

            response_text = call_ollama(
                prompt=user_prompt,
                system_prompt=system_prompt
            )

            challenge_data = extract_json(response_text)

            # Validate structure
            required_keys = {
                "title",
                "question",
                "options",
                "correct_answer_index",
                "explanation",
                "time_complexity",
                "space_complexity"
            }

            if not required_keys.issubset(challenge_data.keys()):
                raise ValueError("Missing required fields")

            if len(challenge_data["options"]) != 4:
                raise ValueError("Options must contain exactly 4 items")

            print(f"✅ Generated: {challenge_data['title']}")
            return challenge_data

        except Exception as e:
            print(f"⚠ Attempt {attempt+1} failed: {e}")
            time.sleep(1)

    print("❌ Using fallback challenge.")
    return get_fallback_challenge(topic, difficulty)


# ============= FALLBACK CHALLENGE =============
def get_fallback_challenge(topic: str,
                           difficulty: str) -> Dict[str, Any]:
    return {
        "title": f"{topic} {difficulty.capitalize()} Concept",
        "question": f"Which statement best describes {topic}?",
        "options": [
            "Correct definition",
            "Common misconception",
            "Incorrect explanation",
            "Unrelated concept"
        ],
        "correct_answer_index": 0,
        "explanation": "The first option correctly describes the concept.",
        "time_complexity": "Varies",
        "space_complexity": "Varies"
    }


# ============= ASYNC SUPPORT =============
async def generate_challenge_async(topic: str, difficulty: str):
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        return await loop.run_in_executor(
            executor,
            generate_challenge,
            topic,
            difficulty
        )


# ============= CACHING =============
@lru_cache(maxsize=50)
def generate_challenge_cached(topic: str, difficulty: str) -> str:
    return json.dumps(generate_challenge(topic, difficulty))


# ============= MAIN TEST =============
if __name__ == "__main__":
    print("=" * 80)
    print("🦙 LLAMA3 CODING CHALLENGE GENERATOR")
    print("=" * 80)

    challenge = generate_challenge("Algorithms", "hard")
    print(json.dumps(challenge, indent=2, ensure_ascii=False))
