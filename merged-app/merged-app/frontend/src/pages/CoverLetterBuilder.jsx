import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, ArrowLeft, Copy, CheckCircle } from 'lucide-react';

export default function CoverLetterBuilder() {
  const { username } = useParams();
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCoverLetter('');
    setCopied(false);
    
    try {
      const res = await fetch(`http://localhost:8000/api/cover-letter/${username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_description: jobDescription }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate cover letter');
      
      setCoverLetter(data.cover_letter);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1.5rem', transition: 'color 0.2s', ':hover': { color: 'var(--primary)' } }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
           <FileText size={24} />
           <h1 className="title" style={{ fontSize: '1.5rem', margin: 0 }}>Cover Letter Generator</h1>
        </div>
        
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Target Job Description</label>
            <textarea 
              rows="8" 
              placeholder="Paste the job description here or leave blank for a general presentation letter..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            ></textarea>
          </div>
          
          {error && <div style={{ color: '#f87171', fontSize: '0.875rem', padding: '0.75rem', background: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.1)', borderRadius: 'var(--radius)' }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start', height: '48px', padding: '0 2rem' }}>
            {loading ? <div className="loader"></div> : <FileText size={16} />}
            {loading ? 'Generating...' : 'Generate with AI'}
          </button>
        </form>
      </div>
      
      {coverLetter && (
        <div className="glass-panel" style={{ animation: 'fade-in 0.5s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Your Cover Letter</h2>
            <button onClick={copyToClipboard} className="btn" style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}>
              {copied ? <CheckCircle size={16} color="var(--accent)" /> : <Copy size={16} />}
              {copied ? 'Copied to Clipboard!' : 'Copy'}
            </button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem', color: 'var(--text-muted)' }}>
            {coverLetter}
          </div>
        </div>
      )}
    </div>
  );
}
