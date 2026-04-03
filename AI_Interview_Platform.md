# Voice-First AI Interview Platform

## 1. Executive Summary
The platform is designed to provide highly realistic, voice-based AI interview practice sessions for candidates preparing for software engineering roles. By simulating real-world interview conditions tailored to specific companies (e.g., Google, startups, service-based), the platform evaluates candidates across multiple dimensions—from basic introductions and behavioral traits to advanced algorithms and system design. 

## 2. Core Workflows & Inputs
Before an interview begins, the system receives the following foundational data:
1. **Resume JSON:** A parsed JSON object containing the candidate's education, experience, projects, and skills. The AI will strictly do **Resume-Aware Interviewing**, meaning questions will actively depend on the candidate's specific tech stack and projects.
2. **Target Company & Style:** The company the candidate is applying for dictates the interview style. The AI adopts a **Company-Specific Style**:
   - **Product-Based (FAANG-like):** DSA heavy + deep probing.
   - **Startup:** Practical + project-based focus.
   - **Service-Based:** Easier + behavioral focus.

## 3. Interaction Modality & Tone
- **Voice-First Experience:** The core interaction is voice-to-voice.
- **Agent Persona Variations:** The agent's tone will vary dynamically. At the start of *any* separate round, it will begin with warm small-talk (e.g., *"Hi, how are you feeling? Aren't you anxious? No need to worry, everything will be good"*) to make the candidate comfortable. Throughout the interview, the AI can exhibit varying personalities—sometimes very calm and supportive, and other times intentionally rude or strict to simulate difficult interviewers.

## 4. Interview Modes
The platform offers two primary structures: **Custom Mode** and **Full-Fledged Interview Mode**.

### A. Custom Mode
Candidates can select specific rounds to practice isolated skills:
1. **Intro & Resume Deep Dive:** Warm-up questions, resume authentication, and motivation.
2. **Behavioral / Cultural Fit:** STAR method scenarios tied to company values.
3. **DSA Round 1 (Standard Core Data Structures):** Problem-solving approach, basic complexities, and optimal data structure usage.
4. **DSA Round 2 (Advanced Algorithms):** Hard-level algorithms, dynamic programming, advanced graph theory, and heavy optimization.
5. **System Design:** High-level architecture, scalability, microservices, database choices, and trade-offs.

### B. Full-Fledged Interview Mode
A seamless, end-to-end simulation combining the elements above into a cohesive 45-60 minute interview. 

---

## 5. Technical Requirements & Architecture
*(Optimized for Hackathon Scope)*

### Backend / Core Logic
- **Language/Framework:** Python (FastAPI).
- **LLM Engine:** Gemini API (Google). 
- **State Management:** Instead of using Redis, interview state and values will be temporarily stored on the client side using **LocalStorage** and passed back to the backend via requests.
- **Communication Protocol:** Standard HTTP (REST). **No WebSockets** will be used to reduce architectural complexity.

### Database
- **Primary DB:** MongoDB to store user profiles, resume JSONs, historical interview transcripts, and final feedback reports.

### Frontend
- **Current Scope:** No frontend will be built for now; the focus is exclusively on the API endpoints and the core AI agent logic.

---

## 6. Core AI Behaviors & Realism Features

To deeply replicate a real-world interviewer, the Gemini agent must enforce the following rules:

1. **Dynamic Questioning & Adaptive Hinting:**
   - **If the user struggles:** The AI provides subtle hints. *Crucially, hints are capped at a maximum of 2-3*. If the candidate is still stuck after 3 hints, the agent gracefully drops the question and moves on.
   - **If the user is strong:** The AI seamlessly increases the difficulty on the fly.
2. **Relentless Follow-Ups (Grilling):**
   - The AI will deeply drill into solutions. Example: *"Your solution is O(n²). Can you do better? Think again."* Follow-ups are mandatory for a realistic experience.
3. **Pressure Simulation:**
   - Inducing time pressure.
   - Simulated interruptions and curveballs to test the candidate's composure.

## 7. Continuous Evaluation & Detailed Reporting
Throughout the entire interview step-by-step, the agent will continuously evaluate and assign marks to the candidate on various attributes (communication, code quality, problem-solving, behavioral fit). 
At the conclusion of the interview, a highly **Detailed Performance Report** is generated, compiling all marks and providing actionable feedback.
