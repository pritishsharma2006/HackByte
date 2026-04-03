import os
import google.generativeai as genai

# Setup Gemini Config
genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

# Use gemini-2.5-flash which is fast and supports audio natively
model = genai.GenerativeModel(
    'gemini-2.5-flash',
    system_instruction=None  # We'll set this per-session
)

class GeminiInterviewService:
    @staticmethod
    def construct_system_prompt(resume: str, company: str, mode: str, question_data: dict = None) -> str:
        prompt_templates = {
            "Behavioral": f'''
You are a strict, top-tier engineering manager at {company} conducting a Behavioral interview.
The candidate's profile is:
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
The candidate's profile is:
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
The candidate's profile is:
{resume}

Rules for Technical Operations:
1. {question_block}
2. ADAPTIVE HINTING: Provide subtle hints only if they struggle. Challenge suboptimal time complexities (e.g. "This is O(N^2), can you do better?").
3. Keep your responses conversational length (2-4 sentences max).
4. The candidate gives vocal responses. Read their parsed text and respond fluidly.
5. IMPORTANT EDITOR TRIGGER: If you want them to begin typing code or ask a new coding question, you MUST append this exact tag exactly at the very end of your response string: `[CODING_ROUND]`.
6. Live Syntax Bridge: They have a live IDE. If code is provided in your context, critique it directly (syntax bugs, edge cases) in your response!
        '''
        
        prompt_templates["DSA Round"] = dsa_rules
        prompt_templates["Full-Fledged"] = dsa_rules

        # Route the final system template cleanly
        final_prompt = prompt_templates.get(mode, dsa_rules)
        return final_prompt.strip()

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
