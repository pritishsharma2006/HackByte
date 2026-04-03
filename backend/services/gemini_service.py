from dotenv import load_dotenv
load_dotenv()

import os
import google.generativeai as genai

# Setup Gemini Config explicitly now that dotenv is loaded
api_key = os.getenv("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

class GeminiInterviewService:
    @staticmethod
    def construct_system_prompt(candidate_name: str, resume: str, company: str, mode: str, question_data: dict = None) -> str:
        prompt_templates = {
            "Behavioral": f'''
You are a strict, top-tier engineering manager at {company} conducting a Behavioral interview.
The candidate's name is {candidate_name}.
Their resume profile is:
{resume}

Rules for Behavioral Mode:
1. ONLY ask behavioral, cultural, or resume-deep-dive questions.
2. Demand the STAR method (Situation, Task, Action, Result) in their answers.
3. Do NOT ask any coding algorithms or system design questions.
4. If they give vague answers, explicitly challenge them on missing details.
5. Keep your responses conversational (2-4 sentences max). You are speaking to them directly.
            ''',
            "System Design": f'''
You are a strict Senior Staff Engineer at {company} conducting a System Design interview.
The candidate's name is {candidate_name}.
Their resume profile is:
{resume}

Rules for System Design Mode:
1. Focus entirely on architecture, scaling systems, load balancers, database choices, APIs, networks, and tradeoffs.
2. Probe into failure cases (e.g. "What if the DB goes down?", "How does it handle 1M RPS?").
3. Do NOT ask them to write code. This is purely architectural block-level design.
4. Challenge their choices aggressively.
5. Keep your responses conversational length (2-4 sentences max). You are speaking directly.
            '''
        }

        # Isolate technical configurations for algorithms
        question_block = "Provide them with a challenging Data Structures and Algorithms question."
        if question_data:
            question_block = (f"You MUST ask them to solve this precise algorithmic question commonly asked at your company: "
                              f"'{question_data['title']}' (Difficulty: {question_data['difficulty']}).")

        dsa_rules = f'''
You are a rigorous Software Engineering Interviewer at {company} conducting a Technical Coding Round.
The candidate's name is {candidate_name}. Speak to them naturally using their name when appropriate.
Their resume profile is:
{resume}

Rules for Technical Operations:
1. {question_block}
2. CRITICAL HALLUCINATION LOCK: You are strictly isolated to the exact Data Structure problem specified above. Under NO CIRCUMSTANCES are you allowed to discard this algorithmic question, invent a new problem, or switch the topic mid-interview.
3. CONVERSATIONAL RECOVERY: If the candidate says something unintelligible, asks you to simplify, or if the transcription seems broken, DO NOT apologize profoundly and DO NOT change the problem statement. Simply state "I didn't quite catch that. To clarify, the problem we are solving is [Problem Name]..."
4. ADAPTIVE HINTING: Provide subtle hints only if they struggle. Challenge suboptimal time complexities (e.g. "This is O(N^2), can you do better?").
5. Keep your responses conversational length (2-4 sentences max).
6. The candidate gives vocal responses. Read their parsed text and respond fluidly.
7. IMPORTANT EDITOR TRIGGER: If you want them to begin typing code or ask a new coding question, you MUST append this exact tag exactly at the very end of your response string: `[CODING_ROUND]`.
8. Live Syntax Bridge: They have a live IDE. If code is provided in your context, critique it directly (syntax bugs, edge cases) in your response!
        '''
        
        prompt_templates["DSA Round"] = dsa_rules
        prompt_templates["Full-Fledged"] = dsa_rules

        # Route the final system template cleanly
        final_prompt = prompt_templates.get(mode, dsa_rules)
        return final_prompt.strip()

    @staticmethod
    async def generate_initial_greeting(candidate_name: str, mode: str, company: str, mood: str, question_data: dict = None) -> str:
        if not os.getenv("GEMINI_API_KEY"):
            return "Please configure the GEMINI_API_KEY in the .env file."
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        greeting_model = genai.GenerativeModel("gemini-2.5-flash")
        
        system_base = f"You are a realistic Engineering Supervisor at {company} conducting a {mode} interview."
        if question_data:
            system_base += f" You are planning to ask them to solve: {question_data.get('title')}."
            
        system_base += f"\nYour CURRENT MOOD is: {mood}. DO NOT explicitly say your mood word, simply act like it."
        system_base += f"\nGenerate exactly 1 to 2 sentences of highly realistic opening conversational dialogue to greet {candidate_name} and prepare them for the technical interview. Ask them how they are doing to kick off the conversation."
        
        response = greeting_model.generate_content(system_base)
        return response.text.replace("*", "").strip()

    @staticmethod
    async def process_text_reply(history: list, user_text: str, system_prompt: str, current_code: str = None) -> str:
        if not os.getenv("GEMINI_API_KEY"):
            return "Please configure the GEMINI_API_KEY in the .env file."

        try:
            # Build a model with the system instruction baked in
            interview_model = genai.GenerativeModel(
                'gemini-2.5-flash',
                system_instruction=system_prompt
            )

            # Build the conversation history as proper Content objects
            gemini_history = []
            for msg in history:
                role = "user" if msg["role"] == "candidate" else "model"
                gemini_history.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })

            # Start a chat with existing history
            chat = interview_model.start_chat(history=gemini_history)

            # Combine user speech and live code editor state into one combined contextual request
            if current_code and current_code.strip():
                user_msg_combined = f"{user_text}\n\n--- CURRENT CANDIDATE CODE ---\n{current_code}\n------------------------------"
            else:
                user_msg_combined = user_text

            # Send the transcribed text as the latest user message
            response = chat.send_message(user_msg_combined)

            return response.text

        except Exception as e:
            print(f"Gemini API error: {e}")
            import traceback
            traceback.print_exc()
            return f"I'm sorry, I had a brief technical issue. Could you please repeat that? (Error: {str(e)[:100]})"
