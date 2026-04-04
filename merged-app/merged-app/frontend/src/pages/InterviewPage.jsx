import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';

const BOILERPLATES = {
    python: "def solve():\n    pass\n",
    cpp: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};",
    java: "import java.util.*;\n\nclass Solution {\n    public void solve() {\n        \n    }\n}",
    javascript: "function solve() {\n    \n}"
};

const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #444',
    backgroundColor: '#2d2d2d',
    color: '#fff',
    fontSize: '15px',
    boxSizing: 'border-box'
};

const btnStyle = {
    padding: '12px 20px', fontSize: '16px', cursor: 'pointer',
    border: 'none', borderRadius: '5px', color: 'white', fontWeight: 'bold',
    backgroundColor: '#3f51b5'
};

export default function InterviewPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [session, setSession] = useState(null);
    const sessionRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState([]);
    const messagesRef = useRef([]);
    const [showEditor, setShowEditor] = useState(false);
    const [language, setLanguage] = useState("python");
    const [code, setCode] = useState(BOILERPLATES["python"]);
    const codeRef = useRef(code);
    const idleTimerRef = useRef(null);
    const activeObserverRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const lastSentCodeRef = useRef(code);
    const [questionData, setQuestionData] = useState(null);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isInitializing, setIsInitializing] = useState(false);
    const speechBufferRef = useRef("");
    const speechTimeoutRef = useRef(null);

    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [interviewReport, setInterviewReport] = useState(null);
    const [interviewScore, setInterviewScore] = useState(null);

    // Dynamic initial values based on auth context
    const [candidateName, setCandidateName] = useState(user?.data?.name || user?.username || "");
    const [company, setCompany] = useState("Google");
    const [mode, setMode] = useState("Full-Fledged");
    
    // Extract summary or first experience for resume context
    const initialResume = user?.data?.summary || 
                         (user?.data?.experience?.[0] ? `${user.data.experience[0].role} at ${user.data.experience[0].company}` : "") ||
                         "Software Engineer Candidate";
    const [resume, setResume] = useState(initialResume);

    const videoRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!user) {
            navigate('/landing');
            return;
        }
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => console.error("Error accessing media devices.", err));

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsRecording(true);

            recognition.onresult = (event) => {
                window.speechSynthesis.cancel();
                let transcriptBlock = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    transcriptBlock += event.results[i][0].transcript;
                }
                if (transcriptBlock.trim().length > 3) {
                    speechBufferRef.current += " " + transcriptBlock.trim();
                    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                    speechTimeoutRef.current = setTimeout(() => {
                        const finalTranscript = speechBufferRef.current.trim();
                        if (finalTranscript.length > 0) {
                            sendSpeechToBackend(finalTranscript);
                        }
                        speechBufferRef.current = "";
                    }, 1800);
                }
            };

            recognition.onerror = (event) => console.error("Speech recognition error:", event.error);

            recognition.onend = () => {
                setIsRecording(false);
                if (sessionRef.current) {
                    try { recognition.start(); } catch (e) { }
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (activeObserverRef.current) clearInterval(activeObserverRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (session && showEditor) {
            activeObserverRef.current = setInterval(() => {
                if (codeRef.current && codeRef.current !== lastSentCodeRef.current) {
                    lastSentCodeRef.current = codeRef.current;
                    sendSpeechToBackend("[BACKGROUND_CODE_CHECK]", true);
                }
            }, 30000);
        } else {
            if (activeObserverRef.current) clearInterval(activeObserverRef.current);
        }
        return () => {
            if (activeObserverRef.current) clearInterval(activeObserverRef.current);
        }
    }, [session, showEditor]);

    const handleEditorChange = (value) => {
        setCode(value);
        codeRef.current = value;
        const isDefault = Object.values(BOILERPLATES).some(b => value.trim() === b.trim());
        if (isDefault) return;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            if (sessionRef.current) {
                sendSpeechToBackend("[CANDIDATE IS SILENT/STUCK: The candidate stopped coding and speaking for 25 seconds. Briefly check in to offer a subtle hint.]", true);
            }
        }, 25000);
    };

    const handleStartInterview = async () => {
        if (isInitializing) return;
        setIsInitializing(true);
        try {
            const res = await fetch("http://localhost:8000/api/interview/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    candidate_name: candidateName.trim() || "Candidate",
                    resume_text: resume,
                    target_company: company,
                    mode: mode
                })
            });
            const data = await res.json();
            if (data.error) { alert(`Failed to start: ${data.error}`); return; }

            setSession(data.session_id);
            sessionRef.current = data.session_id;
            if (data.question_data) setQuestionData(data.question_data);

            setTimeElapsed(0);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);

            if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) { }
            }

            const newHistory = [{ role: "model", content: data.message }];
            setMessages(newHistory);
            messagesRef.current = newHistory;

            if (data.message && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(data.message);
                window.speechSynthesis.speak(utterance);
            }
        } catch (err) {
            console.error(err);
            alert(`Failed to start: Network Initialization Error`);
        } finally {
            setIsInitializing(false);
        }
    };

    const sendSpeechToBackend = async (transcript, isHidden = false) => {
        const currentSession = sessionRef.current;
        if (!currentSession) return;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

        if (!isHidden) {
            const newMessages = [...messagesRef.current, { role: "candidate", content: transcript }];
            setMessages(newMessages);
            messagesRef.current = newMessages;
        }

        const formData = new FormData();
        formData.append("session_id", currentSession);
        formData.append("candidate_name", candidateName.trim() || "Candidate");
        formData.append("resume_text", resume);
        formData.append("target_company", company);
        formData.append("mode", mode);
        formData.append("history", JSON.stringify(messagesRef.current));
        formData.append("user_text", transcript);

        if (questionData) {
            formData.append("question_title", questionData.title || "");
            formData.append("question_difficulty", questionData.difficulty || "");
        }
        if (showEditor) {
            formData.append("current_code", codeRef.current);
        }

        try {
            const res = await fetch("http://localhost:8000/api/interview/reply", {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error("Backend error");
            const data = await res.json();

            const finalHistory = [...messagesRef.current, { role: "model", content: data.reply }];
            setMessages(finalHistory);
            messagesRef.current = finalHistory;

            if (data.is_coding_round) setShowEditor(true);

            if (data.reply && data.reply.includes("[SILENT]")) return;

            if (data.reply && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                const cleanReply = data.reply.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s?/g, '').replace(/_/g, '');
                const utterance = new SpeechSynthesisUtterance(cleanReply);
                window.speechSynthesis.speak(utterance);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const endInterview = async () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        setIsGeneratingReport(true);
        const formData = new FormData();
        formData.append("session_id", sessionRef.current);
        formData.append("history", JSON.stringify(messagesRef.current));
        formData.append("mode", mode);
        formData.append("target_company", company);
        if (questionData) formData.append("question_title", questionData.title || "");

        try {
            const res = await fetch("http://localhost:8000/api/interview/end", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            setInterviewReport(data.detailed_report);
            if (data.score !== null && data.score !== undefined) setInterviewScore(data.score);
        } catch (err) {
            console.error("Failed to generate report:", err);
            setInterviewReport("Critical Error: Evaluation failed to generate.");
        } finally {
            setIsGeneratingReport(false);
            setSession(null);
            sessionRef.current = null;
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (isGeneratingReport) {
        return (
            <div style={{ padding: '50px', textAlign: 'center', color: '#fff', marginTop: '100px' }}>
                <h1 style={{ color: '#4caf50' }}>Evaluating Candidate Performance...</h1>
                <p style={{ fontSize: '18px', color: '#aaa' }}>The Hiring Committee is currently reviewing your transcript and coding structures.</p>
                <div style={{ marginTop: '30px', fontStyle: 'italic', color: '#666' }}>This may take 10-15 seconds depending on interview length.</div>
            </div>
        );
    }

    if (interviewReport) {
        const scoreColor = interviewScore >= 80 ? '#4caf50' : interviewScore >= 60 ? '#ff9800' : interviewScore >= 40 ? '#ff5722' : '#f44336';
        const scoreLabel = interviewScore >= 80 ? 'Exceptional' : interviewScore >= 60 ? 'Strong' : interviewScore >= 40 ? 'Average' : 'Needs Work';
        const circumference = 2 * Math.PI * 54;
        const strokeDashoffset = circumference - (circumference * (interviewScore || 0)) / 100;

        return (
            <div style={{ padding: '30px', maxWidth: '1000px', margin: 'auto', backgroundColor: '#1e1e1e', color: '#eee', borderRadius: '10px', marginTop: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '20px' }}>
                    <h1 style={{ margin: 0, color: '#4caf50' }}>{company} - Final Evaluation Report</h1>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={() => window.print()} style={{ ...btnStyle, backgroundColor: '#ff9800' }}>📄 Save as PDF</button>
                        <button onClick={() => window.location.href = '/'} style={{ ...btnStyle, backgroundColor: '#f44336' }}>Back to Dashboard</button>
                    </div>
                </div>

                {interviewScore !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px', padding: '25px', backgroundColor: '#252525', borderRadius: '12px', marginBottom: '25px', border: `1px solid ${scoreColor}33` }}>
                        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                            <svg width="120" height="120" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="54" fill="none" stroke="#333" strokeWidth="8" />
                                <circle 
                                    cx="60" cy="60" r="54" fill="none" 
                                    stroke={scoreColor} strokeWidth="8" 
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    transform="rotate(-90 60 60)"
                                    style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                                />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: scoreColor }}>{interviewScore}</div>
                                <div style={{ fontSize: '11px', color: '#888' }}>/100</div>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: scoreColor, marginBottom: '5px' }}>{scoreLabel}</div>
                            <div style={{ fontSize: '14px', color: '#999', lineHeight: '1.5' }}>
                                Problem Solving (30) • Code Quality (30) • Communication (20) • Optimization (20)
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ lineHeight: '1.8', fontSize: '16px', whiteSpace: 'pre-wrap', fontFamily: "system-ui, -apple-system, sans-serif" }}>
                    {interviewReport.replace(/\*\*/g, '').replace(/\*/g, '•')}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: showEditor ? '1400px' : '900px', margin: 'auto', transition: 'max-width 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#fff' }}>
                    {session ? `${company} - ${mode}` : 'AI Interview Simulator'}
                    {session && (
                        <span style={{ fontSize: '18px', color: '#ffb74d', backgroundColor: '#333', padding: '5px 12px', borderRadius: '8px' }}>
                            ⏱️ {formatTime(timeElapsed)}
                        </span>
                    )}
                </h1>
                {session && (
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span style={{ padding: '5px 15px', backgroundColor: '#333', borderRadius: '15px', color: '#4caf50', fontWeight: 'bold' }}>
                            {isRecording ? "Listening Ambiently..." : "Ambient Mic Parsing..."}
                        </span>
                        <button onClick={endInterview} style={{ ...btnStyle, backgroundColor: '#f44336', padding: '8px 15px' }}>Leave Call</button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: showEditor ? '0 0 450px' : '1', transition: 'flex 0.5s ease', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <video ref={videoRef} autoPlay muted style={{ width: '100%', borderRadius: '10px', border: '2px solid #555', backgroundColor: '#000' }} />

                    {!session && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
                            <h3 style={{ margin: 0, color: '#ccc' }}>Interview Parameters</h3>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Your Name</label>
                                <input value={candidateName} onChange={e => setCandidateName(e.target.value)} style={{ ...inputStyle }} placeholder="What should the AI call you?" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Target Company</label>
                                <input list="company-list" value={company} onChange={e => setCompany(e.target.value)} style={{ ...inputStyle }} placeholder="Search or type company... e.g. Amazon" />
                                <datalist id="company-list">
                                    <option value="Google" /><option value="Amazon" /><option value="Facebook" /><option value="Apple" />
                                    <option value="Microsoft" /><option value="Uber" /><option value="Netflix" /><option value="Databricks" />
                                    <option value="Snowflake" /><option value="Stripe" /><option value="Airbnb" /><option value="Goldman Sachs" />
                                    <option value="Palantir" /><option value="Nvidia" /><option value="Tesla" />
                                </datalist>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Interview Mode</label>
                                <select value={mode} onChange={e => setMode(e.target.value)} style={{ ...inputStyle }}>
                                    <option>Full-Fledged</option><option>Behavioral</option><option>DSA Round</option><option>System Design</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Candidate Resume (Context)</label>
                                <textarea value={resume} onChange={e => setResume(e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                            </div>
                            <button onClick={handleStartInterview} disabled={isInitializing} style={{ ...btnStyle, marginTop: '10px', opacity: isInitializing ? 0.6 : 1 }}>
                                {isInitializing ? "Configuring Agent..." : "Initialize Interview Session"}
                            </button>
                        </div>
                    )}

                    {session && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ border: '1px solid #444', borderRadius: '5px', padding: '15px', height: '350px', overflowY: 'auto', backgroundColor: '#1e1e1e' }}>
                                {messages.map((msg, idx) => (
                                    <div key={idx} style={{ marginBottom: '12px', color: msg.role === 'candidate' ? '#90caf9' : '#a5d6a7' }}>
                                        <strong>{msg.role === 'candidate' ? 'You' : 'Interviewer'}:</strong> {msg.content}
                                    </div>
                                ))}
                            </div>
                            <input 
                                type="text"
                                placeholder="Mic not catching you? Type your response here and press Enter..."
                                style={{ ...inputStyle, padding: '12px' }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        sendSpeechToBackend(e.target.value.trim());
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={{ 
                    flex: showEditor ? '1' : '0', 
                    width: showEditor ? 'auto' : '0px', 
                    opacity: showEditor ? 1 : 0, 
                    overflow: 'hidden', 
                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
                    display: 'flex', 
                    flexDirection: 'column' 
                }}>
                    <div style={{ borderRadius: '10px', border: '2px solid #555', height: '800px', backgroundColor: '#1E1E1E', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '10px 15px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#ccc', fontWeight: 'bold' }}>Code Editor</span>
                            <select 
                                value={language} 
                                onChange={(e) => {
                                    const newLang = e.target.value;
                                    const newBoilerplate = BOILERPLATES[newLang];
                                    const isDefault = Object.values(BOILERPLATES).some(b => code.trim() === b.trim());
                                    if (!isDefault) {
                                        if (!window.confirm("Changing language will reset your code to the default boilerplate. Proceed?")) return;
                                    }
                                    setLanguage(newLang);
                                    setCode(newBoilerplate);
                                    codeRef.current = newBoilerplate;
                                }}
                                style={{ backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #555', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}
                            >
                                <option value="python">Python 3</option>
                                <option value="cpp">C++</option>
                                <option value="java">Java</option>
                                <option value="javascript">JavaScript</option>
                            </select>
                        </div>
                        {showEditor && (
                            <Editor
                                height="100%"
                                theme="vs-dark"
                                language={language}
                                value={code}
                                onChange={handleEditorChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 16,
                                    wordWrap: "on",
                                    scrollBeyondLastLine: false,
                                    padding: { top: 20 }
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
