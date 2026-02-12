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


# ============= OLLAMA CONFIGURATION ============
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = "llama3"

print(f"🦙 Using Ollama with model: {OLLAMA_MODEL}")
print(f"   API URL: {OLLAMA_BASE_URL}")


# ============= OLLAMA CLIENT ===================
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
            "top_k": 40
        }
    }

    if system_prompt:
        payload["system"] = system_prompt

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json=payload,
        timeout=(10, 240)
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
    except Exception:
        raise ValueError("Failed to parse JSON from model output")


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
            print(f"🦙 Generating challenge ({attempt+1}/{attempts})...")

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


# ============= FALLBACK ========================
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


# ============= CACHING =========================
@lru_cache(maxsize=50)
def generate_challenge_cached(topic: str, difficulty: str) -> str:
    return json.dumps(generate_challenge(topic, difficulty))


# ============= MAIN TEST ======================
if __name__ == "__main__":
    print("=" * 80)
    print("🦙 LLAMA3 CODING CHALLENGE GENERATOR (STRICT MODE)")
    print("=" * 80)

    challenge = generate_challenge("JavaScript Arrays", "medium")
    print(json.dumps(challenge, indent=2, ensure_ascii=False))
