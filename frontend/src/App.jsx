import { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Webcam & Speech Recognition
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => console.error("Error accessing media devices.", err));

    // Setup Web Speech API for Client-Side STT
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Transcribed speech:", transcript);
        sendSpeechToBackend(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("SpeechRecognition API not supported in this browser.");
    }
  }, []);

  const handleStartInterview = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: "Software Engineer with generic experience for now.",
          target_company: "Google",
          mode: "Full-Fledged"
        })
      });
      const data = await res.json();
      setSession(data.session_id);
      sessionRef.current = data.session_id;
      
      const newHistory = [{ role: "model", content: data.message }];
      setMessages(newHistory);
      messagesRef.current = newHistory;
      
      if (data.audio_base64) {
          console.log("Playing welcome audio...");
          const snd = new Audio("data:audio/mpeg;base64," + data.audio_base64);
          snd.play().catch(e => console.error("Audio autoplay blocked by browser:", e));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRecording = () => {
    if (!session) return alert("Start interview first!");
    if (!recognitionRef.current) return alert("Speech Recognition not supported in this browser.");
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const sendSpeechToBackend = async (transcript) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    
    // Optimistically update history with candidate's actual transcribed text
    const newMessages = [...messagesRef.current, { role: "candidate", content: transcript }];
    setMessages(newMessages);
    messagesRef.current = newMessages;

    const formData = new FormData();
    formData.append("session_id", currentSession);
    formData.append("resume_text", "Software Engineer with generic experience for now.");
    formData.append("target_company", "Google");
    formData.append("mode", "Full-Fledged");
    formData.append("history", JSON.stringify(messagesRef.current));
    formData.append("user_text", transcript);

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
      
      if (data.audio_base64) {
          const snd = new Audio("data:audio/mpeg;base64," + data.audio_base64);
          snd.play().catch(e => console.error("Audio playback failed:", e));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: 'auto' }}>
      <h1>AI Interview Platform (Video Call)</h1>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          style={{ width: '450px', borderRadius: '10px', border: '2px solid #555' }}
        />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!session ? (
            <button onClick={handleStartInterview} style={btnStyle}>Start Interview</button>
          ) : (
            <>
              <p style={{ color: '#aaa' }}>Session ID: {session}</p>
              <button 
                onClick={toggleRecording} 
                style={{ ...btnStyle, backgroundColor: isRecording ? '#f44336' : '#4caf50' }}
              >
                {isRecording ? "Listening... (Click to Stop)" : "Record Answer"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid #444', borderRadius: '5px', padding: '15px', height: '300px', overflowY: 'auto' }}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 ${msg.role === 'candidate' ? 'text-blue-300' : 'text-green-300'}`}>
            <strong>{msg.role === 'candidate' ? 'You' : 'Interviewer'}:</strong> {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '12px 20px', fontSize: '16px', cursor: 'pointer',
  border: 'none', borderRadius: '5px', color: 'white', fontWeight: 'bold',
  backgroundColor: '#3f51b5'
};

export default App;
