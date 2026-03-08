import { ResumeData } from '@/lib/scrapers/types';

interface ResumePreviewProps {
  resumeData: ResumeData;
}

export function ResumePreview({ resumeData }: ResumePreviewProps) {
  return (
    <div className="resume-preview">
      <div style={{ marginBottom: '16px' }}>
        <h3>📄 Extracted Profile</h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginTop: '4px',
            lineHeight: '1.5',
          }}
        >
          {resumeData.summary
            ? resumeData.summary.length > 150
              ? resumeData.summary.slice(0, 150) + '...'
              : resumeData.summary
            : 'No summary found.'}
        </p>
      </div>

      {resumeData.experience && resumeData.experience.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>💼 Experience</h3>
          <div className="preview-grid">
            {resumeData.experience.map((exp, i) => (
              <div key={i} className="preview-card">
                <div className="preview-card-header">{exp.company || 'Unknown Company'}</div>
                <div className="preview-card-sub">{exp.role || 'Unknown Role'}</div>
                <div className="preview-card-meta">{exp.duration || ''}</div>
                {exp.skills && exp.skills.length > 0 && (
                  <div className="preview-card-tags">
                    {exp.skills.map((s, j) => (
                      <span key={j} className="preview-card-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {resumeData.education && resumeData.education.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>🎓 Education</h3>
          <div className="preview-grid">
            {resumeData.education.map((edu, i) => (
              <div key={i} className="preview-card">
                <div className="preview-card-header">
                  {edu.institution || 'Unknown Institution'}
                </div>
                <div className="preview-card-sub">{edu.degree || 'Unknown Degree'}</div>
                <div className="preview-card-meta">{edu.year || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3>🎯 Extracted Skills ({resumeData.skills.length})</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {resumeData.skills.map((skill, i) => (
          <span key={i} className="skill-tag">
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
