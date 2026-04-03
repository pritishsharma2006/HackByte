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
    def construct_system_prompt(resume: str, company: str, style: str) -> str:
        prompt = f"""You are a highly realistic technical interviewer for {company}. The candidate is applying for a software engineering role.
The company style is: {style}.

Candidate Resume Context:
{resume}

RULES:
1. Begin the first interaction with polite, reassuring small talk (e.g., "Hi, how are you feeling?").
2. Ask one question at a time. Wait for the candidate's answer.
3. ADAPTIVE HINTING: If the candidate struggles, provide subtle hints. Maximum of 3 hints per question. If they still fail after 3 hints, move on to the next question.
4. PRESSURE & FOLLOW-UPS: If the candidate gives a suboptimal solution, challenge them (e.g., "This is O(n^2), can you do better?").
5. Do not break character. Be as realistic as a human engineering manager: sometimes calm, sometimes strict.
7. The candidate is talking to you directly. Read their transcribed text and respond naturally.
8. If you want to ask a technical coding question or want them to write code, AT THE EXACT END of your speech, append this exact tag: `[CODING_ROUND]`.
9. The candidate has a live Monaco code editor. If they submit code, it will be provided to you in the prompt. You must review it, point out edge cases, syntax bugs, or time complexities natively!
"""
        return prompt

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
