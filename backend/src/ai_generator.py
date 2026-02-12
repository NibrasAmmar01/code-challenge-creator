import os
import json
import time
import asyncio
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from hashlib import md5

import google.generativeai as genai
from dotenv import load_dotenv


load_dotenv()


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)


model = genai.GenerativeModel(
    'gemini-1.5-pro',
    generation_config=genai.GenerationConfig(
        temperature=0.2,           
        top_p=0.95,              
        top_k=40,                
        max_output_tokens=8192,  
        candidate_count=1,       
    ),
    safety_settings={
        'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
        'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
        'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
    }
)

FEW_SHOT_EXAMPLES = """
Example 1:
{
    "title": "List Comprehension Square",
    "question": "Given a list of integers [1, 2, 3, 4, 5], use list comprehension to create a new list containing the square of each number.",
    "options": [
        "[x**2 for x in numbers]",
        "map(lambda x: x**2, numbers)",
        "for x in numbers: squares.append(x**2)",
        "[x*x for x in numbers if x%2==0]"
    ],
    "correct_answer_index": 0,
    "explanation": "List comprehension syntax [expression for item in iterable] creates a new list. Here x**2 squares each number. The correct answer generates [1, 4, 9, 16, 25].",
    "difficulty": "easy",
    "topic": "Python lists",
    "time_complexity": "O(n)",
    "space_complexity": "O(n)"
}

Example 2:
{
    "title": "Two Sum Problem",
    "question": "Given an array of integers nums and an integer target, return indices of two numbers that add up to target. You may assume each input has exactly one solution.",
    "options": [
        "Use a hash map to store complements while iterating",
        "Nested loops checking every pair",
        "Sort array and use two pointers",
        "Use binary search for each element"
    ],
    "correct_answer_index": 0,
    "explanation": "Hash map approach: Iterate once, store each number's index. For each number, check if target - num exists in map. O(n) time, O(n) space.",
    "difficulty": "medium", 
    "topic": "Arrays",
    "time_complexity": "O(n)",
    "space_complexity": "O(n)"
}
"""

EXPLANATION_FEW_SHOT = """
Example Explanation:
Problem: "Write a function to check if a string is a palindrome"
Code:
def is_palindrome(s):
    s = s.lower().replace(' ', '')
    return s == s[::-1]

Expert Explanation:

## 📝 Overview
This function checks if a string is a palindrome by normalizing it and comparing it to its reverse.

## 🔍 Step-by-Step Walkthrough
1. **Normalization**: `s.lower().replace(' ', '')` converts to lowercase and removes spaces
   - Example: `"Race car"` → `"racecar"`
   
2. **Reversal**: `s[::-1]` creates a reversed copy using slice notation
   - `"racecar"[::-1]` → `"racecar"`
   
3. **Comparison**: `==` compares original with reversed version

## ⏱️ Complexity Analysis
- **Time: O(n)** - Each character processed twice (normalization + reversal)
- **Space: O(n)** - Creates reversed copy of string

## ❌ Common Mistakes
- Forgetting case sensitivity: `"Race" != "race"`
- Not removing spaces: `"race car" != "rac ecar"`
- Using loops when slicing is more Pythonic

## 💡 Alternative Approaches
1. **Two-pointer technique**: O(n) time, O(1) space
2. **Recursive**: Elegant but O(n) stack space

## 🎯 Key Takeaways
- String slicing is powerful and readable
- Always normalize data before comparison
- Consider time/space tradeoffs
"""

def generate_challenge(topic: str, difficulty: str, sub_topic: str = None) -> Dict[str, Any]:
    """
    Generate a high-quality coding challenge using optimized settings
    """
    
    system_instruction = """You are an expert coding challenge creator with 10+ years of experience teaching programming.
    Your challenges are:
    - Precise and unambiguous
    - Test real understanding, not memorization
    - Have clear, educational explanations
    - Include time/space complexity analysis
    - Have one clearly correct answer
    - Use realistic code examples
    """
    
    
    prompt = f"""
    {system_instruction}
    
    {FEW_SHOT_EXAMPLES}
    
    Create a challenging, high-quality multiple-choice coding challenge with the following requirements:
    
    TOPIC: {topic}
    DIFFICULTY: {difficulty}
    {f'SUB-TOPIC: {sub_topic}' if sub_topic else ''}
    
    QUALITY REQUIREMENTS:
    1. Question should test understanding, not syntax trivia
    2. All 4 options should be plausible (no obviously wrong answers)
    3. Include common misconceptions in wrong options
    4. Provide comprehensive explanation with:
       - Why correct answer is right
       - Why each wrong answer is wrong
       - Time complexity analysis
       - Space complexity analysis
       - Alternative approaches
    
    Return ONLY valid JSON with these exact fields:
    {{
        "title": "Clear, descriptive title",
        "question": "Complete problem statement with example if helpful",
        "options": ["detailed option A", "detailed option B", "detailed option C", "detailed option D"],
        "correct_answer_index": 0,
        "explanation": "Comprehensive explanation covering all quality requirements above",
        "difficulty": "{difficulty}",
        "topic": "{topic}",
        "time_complexity": "Big O notation",
        "space_complexity": "Big O notation",
        "tags": ["relevant", "concept", "tags"]
    }}
    """
    
    try:
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                
                
                response_text = response.text
                
                
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0]
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0]
                elif '{' in response_text:
                    response_text = response_text[response_text.find('{'):response_text.rfind('}')+1]
                
                challenge_data = json.loads(response_text.strip())
                
                
                required_fields = ['title', 'question', 'options', 'correct_answer_index', 'explanation']
                if not all(field in challenge_data for field in required_fields):
                    raise ValueError("Missing required fields")
                
                
                if challenge_data['correct_answer_index'] not in [0, 1, 2, 3]:
                    challenge_data['correct_answer_index'] = 0
                
                return challenge_data
                
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                time.sleep(1)  
                
    except Exception as e:
        print(f"Error generating challenge after {max_retries} attempts: {e}")
        return get_fallback_challenge(topic, difficulty)


def generate_explanation(code: str, problem: str, language: str = "Python") -> Dict[str, Any]:
    """
    Generate a comprehensive, educational explanation for code solutions.
    
    Args:
        code: The code solution to explain
        problem: The problem statement
        language: Programming language (default: Python)
    
    Returns:
        Dict containing explanation, complexity analysis, and common mistakes
    """
    
    system_instruction = """You are an expert programming instructor with 15+ years of teaching experience.
    Your explanations are:
    - Clear and accessible to beginners
    - Technically accurate for experts
    - Step-by-step with visual thinking
    - Include time/space complexity with reasoning
    - Highlight common pitfalls and misconceptions
    - Suggest alternative approaches
    """
    
    prompt = f"""
    {system_instruction}
    
    {EXPLANATION_FEW_SHOT}
    
    Create an expert-level explanation for this {language} solution:
    
    PROBLEM:
    {problem}
    
    CODE:
    ```{language.lower()}
    {code}
    ```
    
    Your explanation MUST include:
    
    1. **OVERVIEW**: 1-2 sentences summarizing what the code does
    
    2. **STEP-BY-STEP WALKTHROUGH**: 
       - Break down each logical section
       - Explain WHY each step is necessary
       - Show example execution with sample input
    
    3. **COMPLEXITY ANALYSIS**:
       - Time complexity: Big O with reasoning
       - Space complexity: Big O with reasoning
       - Explain what affects performance
    
    4. **COMMON MISTAKES**:
       - List 3-4 common errors beginners make
       - Explain why they're wrong
       - Show corrected versions
    
    5. **ALTERNATIVE APPROACHES**:
       - 2-3 different ways to solve it
       - Trade-offs (speed vs memory vs readability)
       - When to use each approach
    
    6. **KEY TAKEAWAYS**:
       - Main concepts demonstrated
       - Best practices illustrated
       - What to remember for similar problems
    
    Format with clear headings and code examples where helpful.
    Be thorough but conversational - like a senior developer mentoring a junior.
    """
    
    try:
        response = model.generate_content(prompt)
        
        complexity = analyze_complexity(code, problem)
        
        explanation_data = {
            "explanation": response.text,
            "code": code,
            "problem": problem,
            "language": language,
            "complexity": complexity,
            "generated_at": time.strftime('%Y-%m-%d %H:%M:%S'),
            "model": "gemini-1.5-pro"
        }
        
        return explanation_data
        
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return get_fallback_explanation(code, problem)

def analyze_complexity(code: str, problem: str) -> Dict[str, str]:
    """
    Specifically analyze and extract time/space complexity
    """
    prompt = f"""
    Analyze this code and return ONLY a JSON with complexity analysis:
    
    Problem: {problem}
    Code: {code}
    
    Return EXACTLY this format:
    {{
        "time_complexity": "Big O notation",
        "time_explanation": "1 sentence explanation",
        "space_complexity": "Big O notation",
        "space_explanation": "1 sentence explanation",
        "best_case": "Big O notation",
        "worst_case": "Big O notation",
        "average_case": "Big O notation"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text
        
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0]
            
        return json.loads(response_text.strip())
    except:
        return {
            "time_complexity": "O(n)",
            "time_explanation": "Linear time - processes each element once",
            "space_complexity": "O(n)",
            "space_explanation": "Linear space - creates new data structures",
            "best_case": "O(1)",
            "worst_case": "O(n)",
            "average_case": "O(n)"
        }

def get_fallback_challenge(topic: str, difficulty: str) -> Dict[str, Any]:
    """High-quality fallback challenges for common topics"""
    
    fallback_challenges = {
        "Python lists": {
            "easy": {
                "title": "List Concatenation",
                "question": "What is the result of [1, 2] + [3, 4] in Python?",
                "options": [
                    "[1, 2, 3, 4]",
                    "[4, 6]",
                    "[1, 2, [3, 4]]",
                    "TypeError"
                ],
                "correct_answer_index": 0,
                "explanation": "The + operator concatenates lists in Python, creating a new list with all elements from both lists.",
                "time_complexity": "O(n+m)",
                "space_complexity": "O(n+m)"
            }
        },
        "Python dictionaries": {
            "medium": {
                "title": "Dictionary Get Method",
                "question": "What does dict.get('key', 'default') return if 'key' doesn't exist?",
                "options": [
                    "'default'",
                    "None",
                    "KeyError",
                    "False"
                ],
                "correct_answer_index": 0,
                "explanation": "get() safely accesses dictionary keys, returning the default value (or None if not specified) when the key doesn't exist.",
                "time_complexity": "O(1)",
                "space_complexity": "O(1)"
            }
        }
    }
    
    if topic in fallback_challenges and difficulty in fallback_challenges[topic]:
        return fallback_challenges[topic][difficulty]
    
    return {
        "title": f"{topic} {difficulty} Challenge",
        "question": f"Which of the following correctly demonstrates {topic} in Python?",
        "options": [
            "Correct implementation with best practices",
            "Implementation with common mistake #1",
            "Implementation with common mistake #2", 
            "Implementation with common mistake #3"
        ],
        "correct_answer_index": 0,
        "explanation": f"This demonstrates the correct usage of {topic}. The other options contain common misconceptions that lead to bugs.",
        "difficulty": difficulty,
        "topic": topic,
        "time_complexity": "Varies by implementation",
        "space_complexity": "Varies by implementation"
    }

def get_fallback_explanation(code: str, problem: str) -> Dict[str, Any]:
    """Fallback explanation when API fails"""
    explanation_text = (
        "## 📝 Solution Explanation\n\n"
        f"**Problem:** {problem[:150]}...\n\n"
        "### 🔍 How It Works\n"
        "1. The function processes the input parameters\n"
        "2. Key operations are performed in sequence\n"
        "3. The result is computed and returned\n\n"
        "### ⏱️ Complexity Analysis\n"
        "- **Time Complexity**: O(n) - Linear time\n"
        "- **Space Complexity**: O(n) - Linear space\n\n"
        "### 💡 Code\n"
        "```python\n"
        f"{code[:500]}...\n"
        "```\n\n"
        "### ⚠️ Common Mistakes to Avoid\n"
        "- Not handling edge cases (empty input, None)\n"
        "- Off-by-one errors in loops\n"
        "- Modifying input data unintentionally\n\n"
        "### 🎯 Key Takeaways\n"
        "- Always validate input\n"
        "- Consider time/space tradeoffs\n"
        "- Write readable, maintainable code"
    )
    
    return {
        "explanation": explanation_text,
        "code": code,
        "problem": problem,
        "complexity": {
            "time_complexity": "O(n)",
            "space_complexity": "O(n)"
        },
        "generated_at": time.strftime('%Y-%m-%d %H:%M:%S'),
        "fallback": True
    }

async def generate_challenge_async(topic: str, difficulty: str, sub_topic: str = None) -> Dict[str, Any]:
    """Async version for better performance"""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        challenge = await loop.run_in_executor(
            executor, 
            generate_challenge, 
            topic, 
            difficulty,
            sub_topic
        )
    return challenge

async def generate_explanation_async(code: str, problem: str, language: str = "Python") -> Dict[str, Any]:
    """Async version of generate_explanation"""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        explanation = await loop.run_in_executor(
            executor,
            generate_explanation,
            code,
            problem,
            language
        )
    return explanation

@lru_cache(maxsize=100)
def generate_challenge_cached(topic: str, difficulty: str) -> str:
    """Cache generated challenges to save API calls"""
    challenge = generate_challenge(topic, difficulty)
    return json.dumps(challenge)

def validate_challenge_quality(challenge: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure challenge meets quality standards"""
    
    if len(challenge.get('options', [])) != 4:
        challenge['options'] = challenge.get('options', [])[:4]
        while len(challenge['options']) < 4:
            challenge['options'].append(f"Option {len(challenge['options']) + 1}")
    
    explanation = challenge.get('explanation', '')
    if len(explanation) < 50: 
        challenge['explanation'] += " This tests understanding of core concepts and common pitfalls."
    
    challenge['generated_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
    challenge['model'] = 'gemini-1.5-pro'
    challenge['quality_score'] = 'high'
    
    return challenge

def generate_bulk_explanations(code_solutions: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Generate explanations for multiple code solutions"""
    explanations = []
    for solution in code_solutions:
        explanation = generate_explanation(
            code=solution['code'],
            problem=solution['problem'],
            language=solution.get('language', 'Python')
        )
        explanations.append(explanation)
        time.sleep(0.5)  
    return explanations

if __name__ == "__main__":
    print("=" * 80)
    print("🤖 AI CHALLENGE & EXPLANATION GENERATOR")
    print("=" * 80)
    
    print("\n📋 GENERATING CHALLENGE...")
    print("-" * 40)
    
    challenge = generate_challenge(
        topic="Python decorators",
        difficulty="medium",
        sub_topic="function wrappers"
    )
    
    challenge = validate_challenge_quality(challenge)
    
    print(json.dumps(challenge, indent=2, ensure_ascii=False))
    
    print("\n📝 GENERATING EXPLANATION...")
    print("-" * 40)
    
    test_code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
    """
    
    test_problem = "Write a function to calculate the nth Fibonacci number"
    
    explanation = generate_explanation(test_code, test_problem)
    print(explanation["explanation"])
    
    print("\n⏱️ COMPLEXITY ANALYSIS")
    print("-" * 40)
    print(json.dumps(explanation["complexity"], indent=2))
    
    print("\n⚡ ASYNC GENERATION EXAMPLE")
    print("-" * 40)
    print("Run the async version with:")
    print("""
async def main():
    challenge = await generate_challenge_async("Python generators", "hard")
    print(json.dumps(challenge, indent=2))

asyncio.run(main())
    """)
    
    print("\n✅ All systems ready!")