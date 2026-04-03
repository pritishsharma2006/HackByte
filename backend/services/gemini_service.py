from dotenv import load_dotenv
load_dotenv(override=True)

import os
import google.generativeai as genai

# Setup Gemini Config explicitly now that dotenv is loaded
api_key = os.getenv("GEMINI_API_KEY", "")
if api_key:
    genai.configure(api_key=api_key)

class GeminiInterviewService:

    # Shared personality core injected into every mode
    PERSONALITY_CORE = '''
VOICE & BREVITY (YOU MUST OBEY THESE IN EVERY SINGLE RESPONSE):
- YOU ARE NOT A TEACHER. YOU ARE NOT A PROFESSOR. You are a laid-back, sharp peer interviewer having a casual voice conversation.
- KEEP IT SHORT. Your DEFAULT response is 1-2 sentences. That is it. Do NOT write paragraphs.
- The ONLY time you may write more than 3 sentences is if the candidate explicitly says "can you explain more" or "I dont understand the problem". Otherwise, 1-2 sentences. Always.
- Use casual spoken English. Contractions always. "you're", "that's", "don't", "let's", "gonna".
- Start with a quick reaction: "Got it.", "Sure.", "Nice.", "Okay.", "Hmm.", "Right."
- NEVER repeat the problem statement unless the candidate explicitly asks you to repeat it.
- NEVER lecture. NEVER monologue. NEVER give unsolicited walkthroughs or examples unless they ask.
- NEVER use markdown. No asterisks, no bold, no headers, no bullet points, no backticks. Plain spoken words only.
- NEVER use placeholder brackets like [Your Name] or [Problem Name].
- If the candidate's audio is garbled or unclear, just say "Sorry, didn't catch that, say again?" — one sentence, move on.
- Do NOT keep asking the same question over and over. If they don't answer after two tries, just move forward.

RESPECTING THE CANDIDATE'S FLOW:
- If the candidate wants to code, LET THEM CODE. Say "Sure, go ahead" and watch. Do NOT block them.
- If the candidate wants to talk through their approach first, let them talk.
- If the candidate wants to skip the example and jump to coding, that is FINE. Say "Alright, go for it."
- Do NOT force them to explain examples if they dont want to. You are an interviewer, not a gatekeeper.
- Do NOT repeat yourself. If you already explained something, do not say it again.
- The candidate drives the pace. You observe, react, and nudge when needed. Thats it.
'''

    @staticmethod
    def construct_system_prompt(candidate_name: str, resume: str, company: str, mode: str, question_data: dict = None) -> str:

        behavioral_prompt = f'''
You are a chill senior engineering manager at {company} interviewing {candidate_name} on behavioral topics.
Resume: {resume}

{GeminiInterviewService.PERSONALITY_CORE}

BEHAVIORAL RULES:
1. Ask one behavioral question at a time. Wait for their answer.
2. If their answer is vague, push back in one sentence: "What did YOU specifically do though?"
3. If their answer is solid, say "Nice, solid answer" and move to the next question.
4. No coding, no system design.
'''

        system_design_prompt = f'''
You are a senior staff engineer at {company} interviewing {candidate_name} on system design.
Resume: {resume}

{GeminiInterviewService.PERSONALITY_CORE}

SYSTEM DESIGN RULES:
1. Ask about architecture, scaling, trade-offs. No code.
2. Push back on choices briefly: "Why SQL over NoSQL here?"
3. If their design is solid, acknowledge it and probe deeper on one thing.
'''

        question_block = "Pick a challenging DSA question and present it briefly."
        if question_data:
            question_block = (f"The problem is '{question_data['title']}' (Difficulty: {question_data['difficulty']}). "
                              f"Present the problem clearly in 3-4 sentences max. Do NOT walk through examples unless they ask.")

        dsa_prompt = f'''
You are a software engineer at {company} interviewing {candidate_name} on a coding problem.
Resume: {resume}

{GeminiInterviewService.PERSONALITY_CORE}

DSA RULES:
1. {question_block}
2. PROBLEM LOCK: You are locked to this exact problem. You cannot switch, invent, or change it. Period.
3. When the candidate says they want to code, say "Sure, go ahead" and let them. Do NOT block them or force discussion first.
4. When you first present the problem and they're ready to code, append [CODING_ROUND] at the very end of your message.
5. If they ask you to explain or simplify, re-explain the same problem more simply. Do NOT replace it.
6. If code is in your context, review it. Point out bugs briefly: "Your loop skips index 0, check that."
7. If they're stuck for a while, give ONE short hint. Not a lecture. One sentence.
8. If they propose a slow approach, briefly push: "That works but its O(n^2), can you do better?"
9. Let the candidate use whatever programming language they want. Do NOT tell them which language to use.
'''

        prompt_templates = {
            "Behavioral": behavioral_prompt,
            "System Design": system_design_prompt,
            "DSA Round": dsa_prompt,
            "Full-Fledged": dsa_prompt,
        }

        final_prompt = prompt_templates.get(mode, dsa_prompt)
        return final_prompt.strip()

    @staticmethod
    async def generate_initial_greeting(candidate_name: str, mode: str, company: str, mood: str, question_data: dict = None) -> str:
        if not os.getenv("GEMINI_API_KEY"):
            return "Please configure the GEMINI_API_KEY in the .env file."
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        greeting_model = genai.GenerativeModel("gemini-2.5-flash")
        
        import random
        interviewer_name = random.choice(["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Sam", "Riley", "Avery"])
        
        system_base = f"""You are {interviewer_name}, an engineer at {company}. Greet {candidate_name} for a {mode} interview.

Mood: {mood}. Don't say the mood word, just let it color your tone.

Rules:
- Generate ONLY 1 short sentence. Example: "Hey {candidate_name}, I'm {interviewer_name}, I'll be running your interview today, how's it going?"
- No brackets, no markdown, no asterisks. Plain text only.
- Sound like a real human, not a chatbot.
"""
        
        response = greeting_model.generate_content(system_base)
        cleaned = response.text.replace("*", "").replace("#", "").replace("_", "").strip()
        return cleaned

    @staticmethod
    async def process_text_reply(history: list, user_text: str, system_prompt: str, current_code: str = None) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "Please configure the GEMINI_API_KEY in the .env file."

        try:
            genai.configure(api_key=api_key)
            interview_model = genai.GenerativeModel(
                'gemini-2.5-flash',
                system_instruction=system_prompt
            )

            gemini_history = []
            for msg in history:
                role = "user" if msg["role"] == "candidate" else "model"
                gemini_history.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })

            chat = interview_model.start_chat(history=gemini_history)

            is_background_check = "[BACKGROUND_CODE_CHECK]" in user_text
            clean_user_text = user_text.replace("[BACKGROUND_CODE_CHECK]", "").strip()

            if current_code and current_code.strip():
                user_msg_combined = f"{clean_user_text}\n\n--- CURRENT CANDIDATE CODE ---\n{current_code}\n------------------------------"
            else:
                user_msg_combined = clean_user_text

            if is_background_check:
                user_msg_combined += "\n\nSYS_NOTE: The candidate is actively typing this code. You are silently observing. If they have introduced a fatal logical bug or severe syntax error, politely interrupt and point it out in ONE short sentence. If the code is fine, incomplete but on track, or has no critical flaws, you MUST OUTPUT EXACTLY THE STRING `[SILENT]` and absolutely nothing else."

            response = chat.send_message(user_msg_combined)
            return response.text
        except Exception as e:
            raise e

    @staticmethod
    async def generate_interview_report(history: list, mode: str, company: str, question_data: dict = None) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return "Please configure the GEMINI_API_KEY."
        
        genai.configure(api_key=api_key)
        report_model = genai.GenerativeModel("gemini-2.5-flash")
        
        transcript_text = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in history])
        
        system_instruction = f'''
You are a Senior Hiring Committee at {company}.
Evaluate the following {mode} interview transcript.
'''
        if question_data:
            system_instruction += f"\nThe candidate was asked to solve: {question_data.get('title')}.\n"

        system_instruction += f'''
EVALUATION RULES:
1. Provide a detailed report with actionable feedback. Format in clean Markdown.
2. If DSA: praise what they got right, then explain the optimal approach they missed (with complexity analysis).
3. If Behavioral: evaluate STAR method usage. Show what a stronger answer would look like.
4. Be supportive but honest. Make them feel their time was valued.

--- INTERVIEW TRANSCRIPT ---
{transcript_text}
----------------------------
Generate the final report now:
'''
        
        response = report_model.generate_content(system_instruction)
        return response.text
