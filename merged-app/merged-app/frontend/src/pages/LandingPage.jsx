import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout, FileCheck, Globe, Zap, ArrowRight } from 'lucide-react';

const LandingPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse) => {
        try {
            const response = await fetch('http://localhost:8000/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential }),
            });

            const data = await response.json();
            if (response.ok) {
                login(data);
                if (data.status === 'new') {
                    navigate('/onboarding');
                } else {
                    navigate('/');
                }
            } else {
                alert('Login failed: ' + data.detail);
            }
        } catch (error) {
            console.error('Auth error:', error);
            alert('Failed to connect to backend.');
        }
    };

    return (
        <div className="landing-container">
            <header className="hero-section">
                <div className="badge">Version 1.0 Available Now</div>
                <h1 className="title">
                    Professional Profiles. <br />
                    <span className="gradient-text">Built with Precision.</span>
                </h1>
                <p className="subtitle">
                    Transform your resume into a high-performance web portfolio in seconds. 
                    Tailored for developers, designers, and high-growth professionals.
                </p>
                
                <div className="auth-box glass-panel">
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Get Started</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Authenticate with Google to claim your unique URL.
                    </p>
                    <div className="google-btn-wrapper">
                        <GoogleLogin
                            onSuccess={handleSuccess}
                            onError={() => alert('Login Failed')}
                            theme="filled_black"
                            shape="square"
                        />
                    </div>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="icon-box">
                            <Zap size={18} />
                        </div>
                        <h4>Instant Generation</h4>
                        <p>Our underlying models parse your PDF and build a structured portfolio instantly.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon-box">
                            <Globe size={18} />
                        </div>
                        <h4>Personalized Domains</h4>
                        <p>Every profile gets a unique, high-speed public link that represents your professional brand.</p>
                    </div>
                    <div className="feature-card">
                        <div className="icon-box">
                            <FileCheck size={18} />
                        </div>
                        <h4>Document Intelligence</h4>
                        <p>Generate tailored, high-conversion cover letters specifically optimized for each job description.</p>
                    </div>
                </div>
            </header>

            <footer style={{ marginTop: '8rem', borderTop: '1px solid var(--border)', paddingTop: '4rem', paddingBottom: '4rem', opacity: 0.5, fontSize: '0.75rem', textAlign: 'center' }}>
                <p>&copy; 2026 Boom Professional. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
