import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, ExternalLink, LogOut, ArrowUpCircle, Zap, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UploadPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, logout, login } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/landing');
    }
  }, [user, navigate]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('A valid PDF source is required.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('resume', file);
    
    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      
      // Update global user state with new data
      login({ ...user, data: data.data });
      setIsUpdating(false);
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const DashboardView = () => (
    <div className="glass-panel" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="title" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Profile Active</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your professional brand is deployed and indexed.</p>
        </div>
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '20px', color: '#4ade80', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%' }}></div> Live
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Skills</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user.data?.skills?.length || 0}</p>
        </div>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Experience</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user.data?.experience?.length || 0}</p>
        </div>
        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Projects</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>{user.data?.projects?.length || 0}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Link to={`/${user.username}`} target="_blank" className="btn btn-primary" style={{ height: '52px' }}>
          View Live Page <ExternalLink size={16} />
        </Link>
        <Link to={`/${user.username}/cover-letter`} className="btn btn-secondary" style={{ height: '52px' }}>
          Write Cover Letter <FileText size={16} />
        </Link>
      </div>

      <Link to="/interview" className="btn btn-primary" style={{ width: '100%', height: '52px', marginTop: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}>
        <Mic size={18} /> Start AI Mock Interview
      </Link>

      <button 
        onClick={() => setIsUpdating(true)}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1rem', height: '48px', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'var(--transition)' }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        Upload Updated Resume
      </button>
    </div>
  );

  const UploadView = () => (
    <div className="glass-panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 className="title" style={{ fontSize: '1.75rem', margin: 0 }}>{user.data ? 'Update Profile' : `Welcome, ${user?.username}`}</h1>
            {user.data && <button onClick={() => setIsUpdating(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
           {user.data ? 'Replace your existing resume source to refresh your public profile and skills list.' : 'Upload your resume horizontally to start building your professional brand.'}
        </p>
        
        <form onSubmit={handleUpload}>
            <div 
                onClick={() => document.getElementById('file-input').click()}
                style={{ 
                    border: '1px dashed var(--border)', 
                    background: 'rgba(255,255,255,0.02)', 
                    padding: '3rem', 
                    borderRadius: 'var(--radius)', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
                {file ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                        <FileText size={24} />
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{file.name}</p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>PDF Format Recognized</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: 'var(--text-muted)' }}>
                        <ArrowUpCircle size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Drag or Upload your Source PDF</p>
                        <p style={{ fontSize: '0.75rem' }}>Max file size: 10MB</p>
                    </div>
                )}
            </div>
            <input 
                id="file-input"
                type="file" 
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ display: 'none' }}
            />
            
            {error && <div style={{ color: '#f87171', fontSize: '0.75rem', padding: '0.75rem', background: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.1)', borderRadius: 'var(--radius)', marginTop: '2rem' }}>{error}</div>}
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '52px', marginTop: '2.5rem' }} disabled={loading}>
                {loading ? <div className="loader"></div> : <><Upload size={16} /> {user.data ? 'Synchronize Changes' : 'Process with Engine'}</>}
            </button>
        </form>
    </div>
  );

  return (
    <div className="app-container" style={{ paddingTop: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', background: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                    <Zap size={20} color="#000" fill="#000" />
                </div>
                <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>Professional Profile</span>
            </div>
            <button onClick={logout} className="btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <LogOut size={14} /> Disconnect Account
            </button>
        </div>

        {user.data && !isUpdating ? <DashboardView /> : <UploadView />}
    </div>
  );
}
