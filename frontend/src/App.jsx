import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false); // Used to visually indicate mic is hot
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [showEditor, setShowEditor] = useState(false);
  const [code, setCode] = useState("# Write your Python code here...\n");
  const codeRef = useRef(code);
  const idleTimerRef = useRef(null);
  const [questionData, setQuestionData] = useState(null);
  
  // Dynamic Configuration Settings
  const [candidateName, setCandidateName] = useState("");
  const [company, setCompany] = useState("Google");
  const [mode, setMode] = useState("Full-Fledged");
  const [resume, setResume] = useState("Software Engineer with Python and React experience.");

  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Webcam & Ambient Speech Recognition Loop
  useEffect(() => {
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
      recognition.continuous = true;  // The mic stays awake indefinitely
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
          setIsRecording(true);
      };

      recognition.onresult = (event) => {
        // Interruption Engine: Instantly silence the AI if candidate talks!
        window.speechSynthesis.cancel();
        
        // Piece together the latest block of speech
        let transcriptBlock = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcriptBlock += event.results[i][0].transcript;
        }

        if (transcriptBlock.trim()) {
            console.log("Transcribed speech:", transcriptBlock);
            sendSpeechToBackend(transcriptBlock);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
        // The Magic Loop: If the session is alive, force the mic back awake
        if (sessionRef.current) {
            try { recognition.start(); } catch(e) {}
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("SpeechRecognition API not supported in this browser.");
    }

    return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, []);

  const handleEditorChange = (value) => {
      setCode(value);
      codeRef.current = value;

      // Stuck Detector: If 25 seconds pass silently, ping the LLM to intervene proactively
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
          if (sessionRef.current) {
              const pingMsg = "[CANDIDATE IS SILENT/STUCK: The candidate stopped coding and speaking for 25 seconds. Briefly check in to offer a subtle hint.]";
              sendSpeechToBackend(pingMsg, true); // True marks it as hidden
          }
      }, 25000);
  };

  const handleStartInterview = async () => {
    // 1. Force Auto IDE Expansion for Technical Configs
    if (mode === "DSA Round" || mode === "Full-Fledged") {
        setShowEditor(true);
    }

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
      
      if (data.error) {
          alert(`Failed to start: ${data.error}`);
          return;
      }
      
      setSession(data.session_id);
      sessionRef.current = data.session_id;

      if (data.question_data) {
          setQuestionData(data.question_data);
      }

      // Boot Ambient mic loop
      if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch(e) {}
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
    }
  };

  const sendSpeechToBackend = async (transcript, isHidden = false) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    
    // Clear the idle stuck timer if they natively spoke to us!
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    // Optimistically update history with candidate's true response
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

    // Provide the active code safely to Gemini's prompt space if the editor is out
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
      
      if (data.reply && window.speechSynthesis) {
          window.speechSynthesis.cancel(); // Abort previous to ensure fresh playback
          const utterance = new SpeechSynthesisUtterance(data.reply);
          window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const endInterview = () => {
    setSession(null);
    sessionRef.current = null;
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', maxWidth: showEditor ? '1400px' : '900px', margin: 'auto', transition: 'max-width 0.5s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>AI Interview Platform</h1>
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
        
        {/* Left pane: Media & Communication */}
        <div style={{ flex: showEditor ? '0 0 450px' : '1', transition: 'flex 0.5s ease', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <video 
            ref={videoRef} 
            autoPlay 
            muted 
            style={{ width: '100%', borderRadius: '10px', border: '2px solid #555', backgroundColor: '#000' }}
            />
            
            {!session && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '10px', border: '1px solid #333' }}>
                    <h3 style={{ margin: 0, color: '#ccc' }}>Interview Parameters</h3>
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Your Name</label>
                        <input 
                            value={candidateName}
                            onChange={e => setCandidateName(e.target.value)}
                            style={{ ...inputStyle }}
                            placeholder="What should the AI call you?"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Target Company</label>
                        <input 
                            value={company}
                            onChange={e => setCompany(e.target.value)}
                            style={{ ...inputStyle }}
                            placeholder="e.g. Amazon, Databricks, Apple"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Interview Mode</label>
                        <select 
                            value={mode}
                            onChange={e => setMode(e.target.value)}
                            style={{ ...inputStyle }}
                        >
                            <option>Full-Fledged</option>
                            <option>Behavioral</option>
                            <option>DSA Round</option>
                            <option>System Design</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: '#999', fontSize: '14px' }}>Candidate Resume (Context)</label>
                        <textarea 
                            value={resume}
                            onChange={e => setResume(e.target.value)}
                            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                        />
                    </div>

                    <button onClick={handleStartInterview} style={{ ...btnStyle, marginTop: '10px' }}>Initialize Interview Session</button>
                </div>
            )}

            {session && (
                <div style={{ border: '1px solid #444', borderRadius: '5px', padding: '15px', height: '350px', overflowY: 'auto' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`mb-3 ${msg.role === 'candidate' ? 'text-blue-300' : 'text-green-300'}`}>
                    <strong>{msg.role === 'candidate' ? 'You' : 'Interviewer'}:</strong> {msg.content}
                    </div>
                ))}
                </div>
            )}
        </div>

        {/* Right pane: Dynamic Monaco Display */}
        {showEditor && (
            <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', border: '2px solid #444', height: '800px', backgroundColor: '#1e1e1e' }}>
                <Editor
                    height="100%"
                    theme="vs-dark"
                    defaultLanguage="python"
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
            </div>
        )}

      </div>
    </div>
  );
}

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

export default App;
