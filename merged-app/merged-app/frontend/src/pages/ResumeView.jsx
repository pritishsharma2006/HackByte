import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function ResumeView() {
  const { username } = useParams();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset background to a neutral color so the white page pops
    document.body.style.background = '#f3f4f6';
    
    fetch(`http://localhost:8000/api/resume/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('Resume Profile not found');
        return res.json();
      })
      .then(data => setResume(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      // Revert to original background on unmount
      document.body.style.background = 'var(--bg-gradient)';
    };
  }, [username]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="loader" style={{ width: '40px', height: '40px', borderTopColor: '#000' }}></div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div style={{ textAlign: 'center', marginTop: '4rem', color: '#1f2937' }}>
        <h2>{error || 'Profile not found'}</h2>
        <Link to="/" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Go back to Upload</Link>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '850px', 
      margin: '0 auto 4rem auto', 
      background: '#ffffff', 
      color: '#000000',
      minHeight: '1100px',
      padding: '60px 80px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      fontFamily: '"Times New Roman", Times, serif',
      lineHeight: '1.5'
    }}>
      <header style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>
          {resume.name || 'Anonymous Input'}
        </h1>
        <div style={{ fontSize: '0.95rem', color: '#333' }}>
          {resume.email && <span style={{ margin: '0 8px' }}>{resume.email}</span>}
          {resume.email && resume.phone && '|'}
          {resume.phone && <span style={{ margin: '0 8px' }}>{resume.phone}</span>}
          {(resume.email || resume.phone) && resume.linkedin && '|'}
          {resume.linkedin && <span style={{ margin: '0 8px' }}>{resume.linkedin}</span>}
        </div>
      </header>

      {resume.summary && (
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>Professional Summary</h2>
          <p style={{ fontSize: '1rem', textAlign: 'justify' }}>{resume.summary}</p>
        </section>
      )}

      {resume.skills?.length > 0 && (
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>Core Skills</h2>
          <p style={{ fontSize: '1rem' }}>
            <strong>Technical and Soft Skills:</strong> {resume.skills.join(', ')}
          </p>
        </section>
      )}

      {resume.experience?.length > 0 && (
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>Professional Experience</h2>
          {resume.experience.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.05rem', marginRight: '8px' }}>{exp.role}</span>
                  <span style={{ fontStyle: 'italic', fontSize: '1rem' }}>- {exp.company}</span>
                </div>
                <div style={{ fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{exp.duration}</div>
              </div>
              {exp.details && (
                <ul style={{ marginLeft: '20px', fontSize: '0.95rem' }}>
                  {exp.details.map((detail, dIdx) => (
                    <li key={dIdx} style={{ marginBottom: '4px' }}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {resume.projects?.length > 0 && (
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>Projects</h2>
          {resume.projects.map((proj, idx) => (
            <div key={idx} style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 'bold' }}>{proj.title}</span>
                <span style={{ fontSize: '0.95rem' }}>{proj.duration}</span>
              </div>
              <p style={{ fontSize: '0.95rem', marginTop: '4px', textAlign: 'justify' }}>{proj.details}</p>
            </div>
          ))}
        </section>
      )}

      {resume.education?.length > 0 && (
        <section style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>Education</h2>
          {resume.education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{edu.degree}</span>
                  <span style={{ fontStyle: 'italic' }}>- {edu.institution}</span>
                </div>
                <div style={{ fontSize: '0.95rem' }}>{edu.year}</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
