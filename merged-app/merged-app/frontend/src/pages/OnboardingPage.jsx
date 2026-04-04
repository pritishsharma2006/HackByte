import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

const OnboardingPage = () => {
    const { user, login } = useAuth();
    const [username, setUsername] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/landing');
        } else if (user.username) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (username.length >= 3) {
                setChecking(true);
                try {
                    const response = await fetch(`http://localhost:8000/api/user/check-username/${username}`);
                    const data = await response.json();
                    setIsAvailable(data.available);
                } catch (e) {
                    setError('Communication error with identity service.');
                } finally {
                    setChecking(false);
                }
            } else {
                setIsAvailable(null);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [username]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAvailable) return;

        try {
            const response = await fetch('http://localhost:8000/api/user/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, username }),
            });

            const data = await response.json();
            if (response.ok) {
                login({ ...user, username, status: 'existing' });
                navigate('/');
            } else {
                setError(data.detail);
            }
        } catch (e) {
            setError('Failed to finalize account.');
        }
    };

    return (
        <div className="onboarding-container app-container">
            <div className="onboarding-card glass-panel" style={{ textAlign: 'left' }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 className="title" style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Secure Your Handle</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Choose your personal URL. This cannot be modified later.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0 1rem' }}>
                            <span style={{ opacity: 0.3, userSelect: 'none', marginRight: '0.25rem' }}>boom.com/</span>
                            <input
                                type="text"
                                placeholder="..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                style={{ border: 'none', background: 'transparent', flex: 1, padding: '1rem 0', paddingLeft: '0.25rem' }}
                                required
                            />
                            <div className="status-icon" style={{ marginLeft: '1rem' }}>
                                {checking && <Loader2 className="loader" size={16} />}
                                {!checking && isAvailable === true && <CheckCircle style={{ color: '#4ade80' }} size={16} />}
                                {!checking && isAvailable === false && <XCircle style={{ color: '#f87171' }} size={16} />}
                            </div>
                        </div>
                    </div>

                    {username.length > 0 && username.length < 3 && (
                        <p style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '-1rem', marginBottom: '1rem' }}>Minimum 3 characters required.</p>
                    )}

                    {error && <p style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: '1rem' }}>{error}</p>}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '52px' }} disabled={!isAvailable || checking}>
                        Confirm Account Choice <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                    </button>
                    
                    <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.5 }}>
                        By clicking confirm, you agree to claim this professional ID.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default OnboardingPage;
