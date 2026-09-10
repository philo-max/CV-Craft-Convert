import React, { useEffect, useRef, useState } from 'react';

const getResumeFontStack = (fontFamily) => {
  const fontStacks = {
    'Microsoft YaHei': "'Microsoft YaHei', 'Noto Sans SC', sans-serif",
    DengXian: "'DengXian', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
    SimSun: "SimSun, 'Songti SC', serif",
    Inter: "'Inter', 'Noto Sans SC', sans-serif",
    Outfit: "'Outfit', 'Noto Sans SC', sans-serif"
  };
  return fontStacks[fontFamily] || "'Noto Sans SC', sans-serif";
};

function EditableText({ value, path, onChange, onSelect, fieldStyle, className, style, block = false }) {
  const [editing, setEditing] = useState(false);
  const elementRef = useRef(null);
  const Tag = block ? 'div' : 'span';
  const commit = () => {
    const nextValue = elementRef.current?.innerText.replace(/\n+$/g, '') ?? '';
    setEditing(false);
    if (nextValue !== value) onChange(path, nextValue);
  };

  useEffect(() => {
    if (!editing) return;
    elementRef.current?.focus();
  }, [editing]);

  return (
    <Tag
      ref={elementRef}
      className={`resume-editable ${className || ''}`}
      style={{ ...style, ...fieldStyle }}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      tabIndex={0}
      onClick={() => {
        onSelect(path);
        setEditing(true);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          elementRef.current.innerText = value || '';
          elementRef.current.blur();
        }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          elementRef.current.blur();
        }
      }}
      onBlur={commit}
      title="点击直接编辑，Ctrl + Enter 保存，Esc 取消"
    >
      {value}
    </Tag>
  );
}

export default function ResumePreview({ resumeData, layoutConfig, sections, onLayoutConfigChange, onFieldChange, onAddProject, onDeleteProject, onFieldStyleChange }) {
  const { personalInfo, education, skills, projects, honors = [], certificates = [], hobbies = [], selfEvaluation } = resumeData;
  const [selectedField, setSelectedField] = useState(null);
  const [pageOverflow, setPageOverflow] = useState(false);
  const [overflowDismissed, setOverflowDismissed] = useState(false);
  
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
    fontFamily: 'Microsoft YaHei',
    nameFontSize: 22,
    titleFontSize: 12.5,
    bodyFontSize: 10.5,
    lineHeight: 1.55,
    padding: 20,
    doubleLeftPadding: 20,
    doubleRightPadding: 20,
    leftColumnRatio: 31,
    sectionMargin: 16,
    itemMargin: 12,
    titleStyle: 'leftbar',
    borderRadius: 6
  };

  const defaultSectionsOrder = [
    { id: 'education', col: 'left', order: 0 },
    { id: 'skills', col: 'left', order: 1 },
    { id: 'honors', col: 'left', order: 2 },
    { id: 'certificates', col: 'left', order: 3 },
    { id: 'hobbies', col: 'left', order: 4 },
    { id: 'projects', col: 'right', order: 0 },
    { id: 'selfEvaluation', col: 'right', order: 1 }
  ];

  const activeSections = sections || defaultSectionsOrder;
  const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
  const educationCourses = education.courses || [];
  const hasEducation = [education.school, education.major, education.degree, education.startDate, education.endDate, education.status].some(hasText)
    || educationCourses.some(hasText);
  const visibleSkills = skills.filter((skill) => hasText(skill.category) || (skill.items || []).some(hasText));
  const visibleProjects = projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => project.enabled !== false && (
      [project.name, project.role, project.type, project.repo].some(hasText)
      || (project.work || []).some(hasText)
      || (project.outcomes || []).some(hasText)
    ));
  const editText = (path, value, options = {}) => (
    <EditableText path={path} value={value || ''} onChange={onFieldChange} onSelect={setSelectedField} fieldStyle={config.fieldStyles?.[path]} {...options} />
  );
  const selectedStyle = config.fieldStyles?.[selectedField] || {};
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const paper = document.getElementById('resume-print-area');
      if (paper) {
        const overflows = paper.scrollHeight > 1130;
        setPageOverflow(overflows);
        if (!overflows) setOverflowDismissed(false);
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [resumeData, layoutConfig]);

  const renderOverflowNotice = () => pageOverflow && !overflowDismissed ? (
    <div className="resume-overflow-notice no-print">
      <span>内容超过一页 A4，可切换“紧凑排版”或“单页优先”。</span>
      <button type="button" onClick={() => setOverflowDismissed(true)} aria-label="关闭 A4 提示">×</button>
    </div>
  ) : null;
  const renderFormattingToolbar = () => selectedField ? (
    <div className="resume-format-toolbar no-print" role="toolbar" aria-label="文字格式">
      <span className="resume-format-label">文字格式</span>
      <select value={selectedStyle.fontFamily || ''} onChange={(event) => onFieldStyleChange(selectedField, { fontFamily: event.target.value || undefined })} aria-label="字体">
        <option value="">跟随模板</option>
        <option value="Microsoft YaHei">微软雅黑</option>
        <option value="DengXian">等线</option>
        <option value="SimSun">宋体</option>
      </select>
      <input type="number" min="8" max="32" value={selectedStyle.fontSize ? Number.parseFloat(selectedStyle.fontSize) : ''} placeholder="字号" onChange={(event) => onFieldStyleChange(selectedField, { fontSize: event.target.value ? `${event.target.value}pt` : undefined })} aria-label="字号" />
      <button type="button" className={selectedStyle.fontWeight === '700' ? 'is-active' : ''} onClick={() => onFieldStyleChange(selectedField, { fontWeight: selectedStyle.fontWeight === '700' ? undefined : '700' })}>B</button>
      <input type="color" value={selectedStyle.color || config.textColor} onChange={(event) => onFieldStyleChange(selectedField, { color: event.target.value })} aria-label="文字颜色" />
      <button type="button" className={selectedStyle.textAlign === 'left' ? 'is-active' : ''} onClick={() => onFieldStyleChange(selectedField, { textAlign: selectedStyle.textAlign === 'left' ? undefined : 'left' })}>左</button>
      <button type="button" className={selectedStyle.textAlign === 'center' ? 'is-active' : ''} onClick={() => onFieldStyleChange(selectedField, { textAlign: selectedStyle.textAlign === 'center' ? undefined : 'center' })}>中</button>
    </div>
  ) : null;
  const visibleHonors = honors.filter(hasText);
  const visibleCertificates = certificates.filter(hasText);
  const visibleHobbies = hobbies.filter(hasText);
  const visibleEvaluations = selfEvaluation.filter(hasText);

  const displayPhoto = personalInfo.photo?.length > 500000 ? '' : personalInfo.photo;
  const hasPhoto = config.showPhoto && displayPhoto;
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
        return hasEducation ? (
          <div className="resume-section" key="education" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🎓 教育背景')}
            <div style={{ marginBottom: '6px', marginTop: '6px' }}>
              <div className="resume-edu-item">
                {editText('education.school', education.school, { block: true, style: { fontWeight: 'bold' } })}
                <div style={{ fontSize: '12.5px', color: 'var(--resume-text-secondary)' }}>
                  {editText('education.major', education.major)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--resume-text-secondary)', marginBottom: '4px' }}>
                <div>
                  {editText('education.degree', education.degree)}
                  {hasText(education.degree) && hasText(education.status) && ' · '}
                  {hasText(education.status) && editText('education.status', education.status)}
                </div>
                <div>{editText('education.startDate', education.startDate)} – {editText('education.endDate', education.endDate)}</div>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--resume-text-secondary)', lineHeight: '1.4' }}>
                <strong>主修课程</strong>：{editText('education.courses', educationCourses.join('、'))}
              </div>
            </div>
          </div>
        ) : null;
      case 'skills':
        return visibleSkills.length > 0 ? (
          <div className="resume-section" key="skills" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('⚡ 专业技能')}
            <div className="resume-skills-list" style={{ fontSize: '12px', gap: '6px', marginTop: '6px' }}>
              {visibleSkills.map((skill, idx) => (
                <div key={idx} className="resume-skill-cat" style={{ display: 'block' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--resume-text-primary)', marginBottom: '2px', fontSize: '12.5px' }}>{editText(`skills.${idx}.category`, skill.category)}</div>
                  <div style={{ color: 'var(--resume-text-secondary)', lineHeight: '1.4' }}>
                    {(skill.items || []).map((item, itemIdx) => (
                      <span key={itemIdx} style={{ display: 'block', marginBottom: '1px' }}>
                        • {editText(`skills.${idx}.items.${itemIdx}`, item)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      case 'projects':
        return visibleProjects.length > 0 ? (
          <div className="resume-section" key="projects" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🚀 开源项目与实践经历')}
            <div style={{ marginTop: '8px' }}>
              {visibleProjects.map(({ project: proj, index }) => (
                <div key={index} className="resume-project-item" style={{ marginBottom: iMargin }}>
                  <div className="resume-project-header">
                    <div className="resume-project-name-role">
                      {editText(`projects.${index}.name`, proj.name, { style: { fontSize: '14px', fontWeight: 'bold' } })}
                      {editText(`projects.${index}.type`, proj.type, { className: 'resume-project-tag', style: { fontSize: '9px', borderRadius: `${config.borderRadius}px` } })}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--resume-text-secondary)' }}>
                      {editText(`projects.${index}.startDate`, proj.startDate)} – {editText(`projects.${index}.endDate`, proj.endDate)}
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--resume-text-secondary)', marginBottom: '2px', fontStyle: 'italic' }}>
                    角色：{editText(`projects.${index}.role`, proj.role)}
                  </div>
                  {proj.repo && (
                    <div className="resume-project-repo" style={{ fontSize: '11.5px', marginBottom: '4px' }}>
                      开源仓库：{editText(`projects.${index}.repo`, proj.repo)}
                    </div>
                  )}
                  {proj.work && proj.work.length > 0 && (
                    <ul className="resume-bullet-list" style={{ fontSize: '12px' }}>
                      {proj.work.map((workLine, wIdx) => (
                        <li key={wIdx}>{editText(`projects.${index}.work.${wIdx}`, workLine)}</li>
                      ))}
                    </ul>
                  )}
                  {proj.outcomes && proj.outcomes.length > 0 && (
                    <ul className="resume-bullet-list outcomes" style={{ marginTop: '2px', fontSize: '12px' }}>
                      {proj.outcomes.map((outcomeLine, oIdx) => (
                        <li key={oIdx}>{editText(`projects.${index}.outcomes.${oIdx}`, outcomeLine)}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    className="resume-project-delete no-print"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`确定删除项目“${proj.name || '未命名项目'}”吗？`)) onDeleteProject(index);
                    }}
                  >
                    删除项目
                  </button>
                </div>
              ))}
              <button className="resume-project-add no-print" type="button" onClick={onAddProject}>新增项目</button>
            </div>
          </div>
        ) : null;
      case 'honors':
        return visibleHonors.length > 0 ? (
          <div className="resume-section" key="honors" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🏆 荣誉奖项')}
            <div className="resume-honors-list" style={{ fontSize: '12px', gap: '4px', marginTop: '6px' }}>
              {visibleHonors.map((honor, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span>🏆</span>
                  {editText(`honors.${idx}`, honor)}
                </div>
              ))}
            </div>
          </div>
        ) : null;
      case 'certificates':
        return visibleCertificates.length > 0 ? (
          <div className="resume-section" key="certificates" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🎖️ 技能证书')}
            <div className="resume-honors-list" style={{ fontSize: '12px', gap: '4px', marginTop: '6px' }}>
              {visibleCertificates.map((certificate, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span>🎖️</span>
                  {editText(`certificates.${idx}`, certificate)}
                </div>
              ))}
            </div>
          </div>
        ) : null;
      case 'hobbies':
        return visibleHobbies.length > 0 ? (
          <div className="resume-section" key="hobbies" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('🌿 兴趣爱好')}
            <div className="resume-honors-list" style={{ fontSize: '12px', gap: '4px', marginTop: '6px' }}>
              {visibleHobbies.map((hobby, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  <span>🌿</span>
                  {editText(`hobbies.${idx}`, hobby)}
                </div>
              ))}
            </div>
          </div>
        ) : null;
      case 'selfEvaluation':
        return visibleEvaluations.length > 0 ? (
          <div className="resume-section" key="selfEvaluation" style={{ marginBottom: sMargin }}>
            {renderSectionTitle('💡 自我评价')}
            <ul className="resume-eval-list" style={{ fontSize: '12.5px', marginTop: '6px' }}>
              {visibleEvaluations.map((evalLine, idx) => (
                <li key={idx} style={{ listStyleType: 'none', position: 'relative', paddingLeft: '12px', marginBottom: '4px' }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--resume-accent)' }}>•</span>
                  {editText(`selfEvaluation.${idx}`, evalLine)}
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
    '--resume-name-size': `${config.nameFontSize ?? 22}pt`,
    '--resume-title-size': `${config.titleFontSize ?? 12.5}pt`,
    '--resume-body-size': `${config.bodyFontSize ?? 10.5}pt`,
    background: config.bgColor,
    color: config.textColor,
    fontFamily: getResumeFontStack(config.fontFamily),
    padding: `${config.padding}mm ${isDouble ? (config.doubleRightPadding ?? config.padding) : config.padding}mm ${config.padding}mm ${isDouble ? (config.doubleLeftPadding ?? config.padding) : config.padding}mm`,
    lineHeight: config.lineHeight,
    borderRadius: '4px'
  };

  const updateLeftColumnRatio = (event) => {
    if (!onLayoutConfigChange) return;
    const layout = event.currentTarget.parentElement;
    const { left, width } = layout.getBoundingClientRect();
    const ratio = Math.min(45, Math.max(22, Math.round(((event.clientX - left) / width) * 100)));
    onLayoutConfigChange({ ...config, leftColumnRatio: ratio });
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
        className={`resume-paper density-${config.density || 'comfortable'} ${config.timeline ? 'timeline-style' : ''}`}
        id="resume-print-area"
        style={dynamicPaperStyles}
      >
        {renderOverflowNotice()}
        {renderFormattingToolbar()}
        <div className="resume-layout-double" style={{ gridTemplateColumns: `${config.leftColumnRatio ?? 31}% 1fr` }}>
          {/* Left Column (Narrow Sidebar) */}
          <div className="left-col" style={{ borderRight: `1px solid var(--resume-border)` }}>
            {/* Profile Photo */}
            {hasPhoto && (
              <div className="resume-sidebar-photo" style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img 
                  src={displayPhoto}
                  alt="证件照" 
                  style={{ width: '100px', height: '130px', objectFit: 'cover', borderRadius: `${config.borderRadius}px`, border: '1px solid var(--resume-border)' }} 
                />
              </div>
            )}
            
            {/* Contact Info */}
            <div className="resume-section" style={{ marginBottom: `${config.sectionMargin}px` }}>
              {renderSectionTitle('👤 基本信息')}
              <div className="vertical-contact" style={{ marginTop: '6px' }}>
                <div className="vertical-contact-item"><span>📞</span> {editText('personalInfo.phone', personalInfo.phone)}</div>
                <div className="vertical-contact-item"><span>✉️</span> {editText('personalInfo.email', personalInfo.email)}</div>
                <div className="vertical-contact-item" style={{ fontSize: '11px' }}>
                  <span>🔗</span> {editText('personalInfo.github', personalInfo.github)}
                </div>
                {personalInfo.city && <div className="vertical-contact-item"><span>📍</span> {editText('personalInfo.city', personalInfo.city)}</div>}
                {personalInfo.birthDate && <div className="vertical-contact-item"><span>🎂</span> {editText('personalInfo.birthDate', personalInfo.birthDate)}</div>}
              </div>
            </div>

            {/* Modular Sidebar Sections */}
            {leftSections.map(sec => renderSectionContent(sec.id))}
          </div>

          {/* Right Column (Wide Content) */}
          <div className="right-col">
            {/* Header: Name and Intent */}
            <div style={{ borderBottom: `2px solid var(--resume-accent)`, paddingBottom: '10px', marginBottom: '16px' }}>
              {editText('personalInfo.name', personalInfo.name, { className: 'resume-name', block: true, style: { marginBottom: '4px', color: 'var(--resume-accent)' } })}
              <div className="resume-intent" style={{ color: 'var(--resume-text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                求职意向：{editText('personalInfo.intent', personalInfo.intent)}
              </div>
            </div>

            {/* Modular Main Content Sections */}
            {rightSections.map(sec => renderSectionContent(sec.id))}
          </div>
          <div
            className="column-divider-handle no-print"
            title="拖动调整分栏线"
            style={{ left: `${config.leftColumnRatio ?? 31}%` }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateLeftColumnRatio(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) updateLeftColumnRatio(event);
            }}
            onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          />
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
      className={`resume-paper density-${config.density || 'comfortable'} ${config.timeline ? 'timeline-style' : ''}`}
      id="resume-print-area"
      style={dynamicPaperStyles}
    >
      {renderOverflowNotice()}
      {renderFormattingToolbar()}
      {/* Dynamic Header */}
      {hasPhoto ? (
        <div className="resume-header-grid" style={{ marginBottom: `${config.sectionMargin}px` }}>
          <div className="resume-header-info">
            {editText('personalInfo.name', personalInfo.name, { className: 'resume-name', block: true, style: { textAlign: 'left', color: 'var(--resume-accent)' } })}
            <div className="resume-intent" style={{ textAlign: 'left', color: 'var(--resume-text-secondary)', fontWeight: 'bold' }}>
              求职意向：{editText('personalInfo.intent', personalInfo.intent)}
            </div>
            <div className="resume-contact" style={{ justifyContent: 'flex-start' }}>
              <div className="resume-contact-item">
                <span>📞</span> {editText('personalInfo.phone', personalInfo.phone)}
              </div>
              <div className="resume-contact-item">
                <span>✉️</span> {editText('personalInfo.email', personalInfo.email)}
              </div>
              <div className="resume-contact-item">
                <span>🔗</span> {editText('personalInfo.github', personalInfo.github)}
              </div>
              {personalInfo.city && (
                <div className="resume-contact-item">
                  <span>📍</span> {editText('personalInfo.city', personalInfo.city)}
                </div>
              )}
              {personalInfo.birthDate && (
                <div className="resume-contact-item">
                  <span>🎂</span> {editText('personalInfo.birthDate', personalInfo.birthDate)}
                </div>
              )}
            </div>
          </div>
          <div className="resume-header-photo">
            <img src={displayPhoto} alt="证件照" style={{ borderRadius: `${config.borderRadius}px` }} />
          </div>
        </div>
      ) : (
        <div className="resume-header" style={{ marginBottom: `${config.sectionMargin}px` }}>
          {editText('personalInfo.name', personalInfo.name, { className: 'resume-name', block: true, style: { color: 'var(--resume-accent)' } })}
          <div className="resume-intent" style={{ color: 'var(--resume-text-secondary)', fontWeight: 'bold' }}>
            求职意向：{editText('personalInfo.intent', personalInfo.intent)}
          </div>
          <div className="resume-contact" style={{ justifyContent: 'center' }}>
            <div className="resume-contact-item">
              <span>📞</span> {editText('personalInfo.phone', personalInfo.phone)}
            </div>
            <div className="resume-contact-item">
              <span>✉️</span> {editText('personalInfo.email', personalInfo.email)}
            </div>
            <div className="resume-contact-item">
              <span>🔗</span> {editText('personalInfo.github', personalInfo.github)}
            </div>
            {personalInfo.city && (
              <div className="resume-contact-item">
                <span>📍</span> {editText('personalInfo.city', personalInfo.city)}
              </div>
            )}
            {personalInfo.birthDate && (
              <div className="resume-contact-item">
                <span>🎂</span> {editText('personalInfo.birthDate', personalInfo.birthDate)}
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
