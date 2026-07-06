import React from 'react';

export default function ResumePreview({ resumeData, layoutConfig, sections }) {
  const { personalInfo, education, skills, projects, honors, selfEvaluation } = resumeData;
  
  const config = layoutConfig || {
    accentColor: '#1e3a8a',
    dividerColor: '#3b82f6',
    bgColor: '#ffffff',
    textColor: '#1f2937',
    density: 'comfortable',
    showPhoto: true,
    timeline: true,
    layoutStyle: 'double',
    showGuidelines: false,
    fontFamily: 'Noto Sans SC',
    lineHeight: 1.55,
    padding: 20,
    sectionMargin: 16,
    itemMargin: 12,
    titleStyle: 'leftbar',
    borderRadius: 6
  };

  const defaultSectionsOrder = [
    { id: 'education', col: 'left', order: 0 },
    { id: 'skills', col: 'left', order: 1 },
    { id: 'honors', col: 'left', order: 2 },
    { id: 'projects', col: 'right', order: 0 },
    { id: 'selfEvaluation', col: 'right', order: 1 }
  ];

  const activeSections = sections || defaultSectionsOrder;

  const parseInlineMarkdown = (text) => {
    if (!text) return "";
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const hasPhoto = config.showPhoto && personalInfo.photo;
  const isDouble = config.layoutStyle === 'double';

  // Helper to render customized section titles
  const renderSectionTitle = (title) => {
    const style = config.titleStyle || 'leftbar';
    if (style === 'leftbar') {
      return (
        <h3 className="resume-section-title" style={{ borderBottom: '1px solid var(--resume-divider)', paddingBottom: '4px', position: 'relative', paddingLeft: '10px' }}>
          <span style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: '3.5px', background: 'var(--resume-accent)', borderRadius: '2px' }} />
          {title}
        </h3>
      );
    }
    if (style === 'bottomline') {
      return (
        <h3 className="resume-section-title" style={{ borderBottom: '2.5px solid var(--resume-accent)', paddingBottom: '5px' }}>
          {title}
        </h3>
      );
    }
    if (style === 'borderwrap') {
      return (
        <h3 className="resume-section-title" style={{ background: 'rgba(var(--resume-accent-rgb, 30, 58, 138), 0.06)', border: '1px solid var(--resume-accent)', borderRadius: '4px', padding: '6px 12px', fontSize: '14px' }}>
          {title}
        </h3>
      );
    }
    // Plain style
    return (
      <h3 className="resume-section-title" style={{ borderBottom: 'none', paddingLeft: 0, fontWeight: '700', color: 'var(--resume-accent)' }}>
        {title}
      </h3>
    );
  };

  const renderSectionContent = (id) => {
    const sMargin = `${config.sectionMargin}px`;
    const iMargin = `${config.itemMargin}px`;

    switch (id) {
      case 'education':
        return (
          <div className="resume-section" key="education" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🎓 教育背景')}
            <div style={{ marginBottom: '6px', marginTop: '6px' }}>
              <div className="resume-edu-item">
                <div style={{ fontWeight: 'bold' }}>{education.school}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--resume-text-secondary)' }}>
                  {education.major}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--resume-text-secondary)', marginBottom: '4px' }}>
                <div>{education.degree} · {education.status}</div>
                <div>{education.startDate} – {education.endDate}</div>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--resume-text-secondary)', lineHeight: '1.4' }}>
                <strong>主修课程</strong>：{education.courses.join('、')}
              </div>
            </div>
          </div>
        );
      case 'skills':
        return (
          <div className="resume-section" key="skills" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('⚡ 专业技能')}
            <div className="resume-skills-list" style={{ fontSize: '12px', gap: '6px', marginTop: '6px' }}>
              {skills.map((skill, idx) => (
                <div key={idx} className="resume-skill-cat" style={{ display: 'block' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--resume-text-primary)', marginBottom: '2px', fontSize: '12.5px' }}>{skill.category}</div>
                  <div style={{ color: 'var(--resume-text-secondary)', lineHeight: '1.4' }}>
                    {skill.items.map((item, itemIdx) => (
                      <span key={itemIdx} style={{ display: 'block', marginBottom: '1px' }}>
                        • {parseInlineMarkdown(item)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'projects':
        return (
          <div className="resume-section" key="projects" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🚀 开源项目与实践经历')}
            <div style={{ marginTop: '8px' }}>
              {projects.filter(proj => proj.enabled !== false).map((proj, idx) => (
                <div key={idx} className="resume-project-item" style={{ marginBottom: iMargin }}>
                  <div className="resume-project-header">
                    <div className="resume-project-name-role">
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{proj.name}</span>
                      <span className="resume-project-tag" style={{ fontSize: '9px', borderRadius: `${config.borderRadius}px` }}>{proj.type}</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--resume-text-secondary)' }}>
                      {proj.startDate} – {proj.endDate}
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--resume-text-secondary)', marginBottom: '2px', fontStyle: 'italic' }}>
                    角色：{proj.role}
                  </div>
                  {proj.repo && (
                    <div className="resume-project-repo" style={{ fontSize: '11.5px', marginBottom: '4px' }}>
                      开源仓库：<a href={proj.repo.startsWith('http') ? proj.repo : `https://${proj.repo}`} target="_blank" rel="noopener noreferrer">{proj.repo}</a>
                    </div>
                  )}
                  {proj.work && proj.work.length > 0 && (
                    <ul className="resume-bullet-list" style={{ fontSize: '12px' }}>
                      {proj.work.map((workLine, wIdx) => (
                        <li key={wIdx}>{parseInlineMarkdown(workLine)}</li>
                      ))}
                    </ul>
                  )}
                  {proj.outcomes && proj.outcomes.length > 0 && (
                    <ul className="resume-bullet-list outcomes" style={{ marginTop: '2px', fontSize: '12px' }}>
                      {proj.outcomes.map((outcomeLine, oIdx) => (
                        <li key={oIdx}>{parseInlineMarkdown(outcomeLine)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 'honors':
        return honors && honors.length > 0 ? (
          <div className="resume-section" key="honors" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🏆 荣誉证书')}
            <div className="resume-honors-list" style={{ fontSize: '12px', gap: '4px', marginTop: '6px' }}>
              {honors.map((honor, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span>🏆</span>
                  <span>{parseInlineMarkdown(honor)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      case 'selfEvaluation':
        return selfEvaluation && selfEvaluation.length > 0 ? (
          <div className="resume-section" key="selfEvaluation" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('💡 自我评价')}
            <ul className="resume-eval-list" style={{ fontSize: '12.5px', marginTop: '6px' }}>
              {selfEvaluation.map((evalLine, idx) => (
                <li key={idx} style={{ listStyleType: 'none', position: 'relative', paddingLeft: '12px', marginBottom: '4px' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--resume-accent)' }}>•</span>
                  {parseInlineMarkdown(evalLine)}
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  // Convert hex color to rgb components to support alpha values in canvas titles
  const hexToRgbStr = (hex) => {
    if (!hex) return "30, 58, 138";
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return `${r}, ${g}, ${b}`;
    }
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
    return "30, 58, 138";
  };

  const dynamicPaperStyles = {
    '--resume-accent': config.accentColor,
    '--resume-divider': config.dividerColor,
    '--resume-accent-rgb': hexToRgbStr(config.accentColor),
    background: config.bgColor,
    color: config.textColor,
    fontFamily: config.fontFamily === 'Inter' ? "'Inter', 'Noto Sans SC', sans-serif" : config.fontFamily === 'Outfit' ? "'Outfit', 'Noto Sans SC', sans-serif" : "'Noto Sans SC', sans-serif",
    padding: `${config.padding}mm`,
    lineHeight: config.lineHeight,
    borderRadius: '4px'
  };

  if (isDouble) {
    const leftSections = [...activeSections]
      .filter(s => s.col === 'left')
      .sort((a, b) => a.order - b.order);

    const rightSections = [...activeSections]
      .filter(s => s.col === 'right')
      .sort((a, b) => a.order - b.order);

    return (
      <div 
        className={`resume-paper ${config.density === 'compact' ? 'density-compact' : ''} ${config.timeline ? 'timeline-style' : ''}`}
        id="resume-print-area"
        style={dynamicPaperStyles}
      >
        <div className="resume-layout-double">
          {/* Left Column (Narrow Sidebar) */}
          <div className="left-col" style={{ borderRight: `1px solid var(--resume-border)` }}>
            {/* Profile Photo */}
            {hasPhoto && (
              <div className="resume-sidebar-photo" style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img 
                  src={personalInfo.photo} 
                  alt="证件照" 
                  style={{ width: '100px', height: '130px', objectFit: 'cover', borderRadius: `${config.borderRadius}px`, border: '1px solid var(--resume-border)' }} 
                />
              </div>
            )}
            
            {/* Contact Info */}
            <div className="resume-section" style={{ marginBottom: `${config.sectionMargin}px` }}>
              {renderSectionTitle('▍ 联系方式')}
              <div className="vertical-contact" style={{ marginTop: '6px' }}>
                <div className="vertical-contact-item"><span>📞</span> {personalInfo.phone}</div>
                <div className="vertical-contact-item"><span>✉️</span> <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a></div>
                <div className="vertical-contact-item" style={{ fontSize: '11px' }}>
                  <span>🔗</span> <a href={`https://${personalInfo.github}`} target="_blank" rel="noopener noreferrer">{personalInfo.github}</a>
                </div>
                {personalInfo.city && <div className="vertical-contact-item"><span>📍</span> {personalInfo.city}</div>}
              </div>
            </div>

            {/* Modular Sidebar Sections */}
            {leftSections.map(sec => renderSectionContent(sec.id))}
          </div>

          {/* Right Column (Wide Content) */}
          <div className="right-col">
            {/* Header: Name and Intent */}
            <div style={{ borderBottom: `2px solid var(--resume-accent)`, paddingBottom: '10px', marginBottom: '16px' }}>
              <h1 className="resume-name" style={{ fontSize: '28px', marginBottom: '4px', color: 'var(--resume-accent)' }}>{personalInfo.name}</h1>
              <div className="resume-intent" style={{ color: 'var(--resume-text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                求职意向：{personalInfo.intent}
              </div>
            </div>

            {/* Modular Main Content Sections */}
            {rightSections.map(sec => renderSectionContent(sec.id))}
          </div>
        </div>

        {/* Visual page break guide lines */}
        {config.showGuidelines && (
          <>
            <div className="page-break-indicator no-print" style={{ top: '297mm', position: 'absolute', left: 0, right: 0, borderTop: '1px dashed #ef4444', pointerEvents: 'none', height: 0, zIndex: 10 }}>
              <span style={{ position: 'absolute', right: '10px', top: '-18px', background: '#ef4444', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>第一页分页线 (A4 End Page 1)</span>
            </div>
            <div className="page-break-indicator no-print" style={{ top: '594mm', position: 'absolute', left: 0, right: 0, borderTop: '1px dashed #ef4444', pointerEvents: 'none', height: 0, zIndex: 10 }}>
              <span style={{ position: 'absolute', right: '10px', top: '-18px', background: '#ef4444', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>第二页分页线 (A4 End Page 2)</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Classic Single Column Layout
  const sortedSections = [...activeSections].sort((a, b) => a.order - b.order);

  return (
    <div 
      className={`resume-paper ${config.density === 'compact' ? 'density-compact' : ''} ${config.timeline ? 'timeline-style' : ''}`}
      id="resume-print-area"
      style={dynamicPaperStyles}
    >
      {/* Dynamic Header */}
      {hasPhoto ? (
        <div className="resume-header-grid" style={{ marginBottom: `${config.sectionMargin}px` }}>
          <div className="resume-header-info">
            <h1 className="resume-name" style={{ textAlign: 'left', color: 'var(--resume-accent)' }}>{personalInfo.name}</h1>
            <div className="resume-intent" style={{ textAlign: 'left', color: 'var(--resume-text-secondary)', fontWeight: 'bold' }}>
              求职意向：{personalInfo.intent}
            </div>
            <div className="resume-contact" style={{ justifyContent: 'flex-start' }}>
              <div className="resume-contact-item">
                <span>📞</span> {personalInfo.phone}
              </div>
              <div className="resume-contact-item">
                <span>✉️</span> <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>
              </div>
              <div className="resume-contact-item">
                <span>🔗</span> <a href={`https://${personalInfo.github}`} target="_blank" rel="noopener noreferrer">{personalInfo.github}</a>
              </div>
              {personalInfo.city && (
                <div className="resume-contact-item">
                  <span>📍</span> {personalInfo.city}
                </div>
              )}
            </div>
          </div>
          <div className="resume-header-photo">
            <img src={personalInfo.photo} alt="证件照" style={{ borderRadius: `${config.borderRadius}px` }} />
          </div>
        </div>
      ) : (
        <div className="resume-header" style={{ marginBottom: `${config.sectionMargin}px` }}>
          <h1 className="resume-name" style={{ color: 'var(--resume-accent)' }}>{personalInfo.name}</h1>
          <div className="resume-intent" style={{ color: 'var(--resume-text-secondary)', fontWeight: 'bold' }}>
            求职意向：{personalInfo.intent}
          </div>
          <div className="resume-contact" style={{ justifyContent: 'center' }}>
            <div className="resume-contact-item">
              <span>📞</span> {personalInfo.phone}
            </div>
            <div className="resume-contact-item">
              <span>✉️</span> <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>
            </div>
            <div className="resume-contact-item">
              <span>🔗</span> <a href={`https://${personalInfo.github}`} target="_blank" rel="noopener noreferrer">{personalInfo.github}</a>
            </div>
            {personalInfo.city && (
              <div className="resume-contact-item">
                <span>📍</span> {personalInfo.city}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Render Modular Sections vertically */}
      {sortedSections.map(sec => renderSectionContent(sec.id))}

      {/* Visual page break guide lines */}
      {config.showGuidelines && (
        <>
          <div className="page-break-indicator no-print" style={{ top: '297mm', position: 'absolute', left: 0, right: 0, borderTop: '1px dashed #ef4444', pointerEvents: 'none', height: 0, zIndex: 10 }}>
            <span style={{ position: 'absolute', right: '10px', top: '-18px', background: '#ef4444', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>第一页分页线 (A4 End Page 1)</span>
          </div>
          <div className="page-break-indicator no-print" style={{ top: '594mm', position: 'absolute', left: 0, right: 0, borderTop: '1px dashed #ef4444', pointerEvents: 'none', height: 0, zIndex: 10 }}>
            <span style={{ position: 'absolute', right: '10px', top: '-18px', background: '#ef4444', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>第二页分页线 (A4 End Page 2)</span>
          </div>
        </>
      )}
    </div>
  );
}
