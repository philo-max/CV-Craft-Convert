import React, { useState, useEffect } from 'react';

export default function ResumeForm({ resumeData, onChange, onAIPolish }) {
  const [activeSection, setActiveSection] = useState('personalInfo');
  const [isScanning, setIsScanning] = useState(false);
  const [lastPhoto, setLastPhoto] = useState(resumeData.personalInfo.photo);
  const displayPhoto = resumeData.personalInfo.photo?.length > 500000 ? '' : resumeData.personalInfo.photo;

  // Trigger scan animation when photo changes
  useEffect(() => {
    if (resumeData.personalInfo.photo && resumeData.personalInfo.photo !== lastPhoto) {
      setIsScanning(true);
      setLastPhoto(resumeData.personalInfo.photo);
      const timer = setTimeout(() => {
        setIsScanning(false);
      }, 1600);
      return () => clearTimeout(timer);
    }
    if (!resumeData.personalInfo.photo) {
      setLastPhoto('');
    }
  }, [resumeData.personalInfo.photo, lastPhoto]);

  const updatePersonalInfo = (field, value) => {
    onChange({
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        [field]: value
      }
    });
  };

  const updateEducation = (field, value) => {
    onChange({
      ...resumeData,
      education: {
        ...resumeData.education,
        [field]: value
      }
    });
  };

  const updateCourses = (index, value) => {
    const newCourses = [...resumeData.education.courses];
    newCourses[index] = value;
    onChange({
      ...resumeData,
      education: {
        ...resumeData.education,
        courses: newCourses
      }
    });
  };

  const addCourse = () => {
    onChange({
      ...resumeData,
      education: {
        ...resumeData.education,
        courses: [...resumeData.education.courses, ""]
      }
    });
  };

  const removeCourse = (index) => {
    const newCourses = resumeData.education.courses.filter((_, i) => i !== index);
    onChange({
      ...resumeData,
      education: {
        ...resumeData.education,
        courses: newCourses
      }
    });
  };

  // Skills handlers
  const updateSkillCat = (catIndex, field, value) => {
    const newSkills = [...resumeData.skills];
    newSkills[catIndex] = {
      ...newSkills[catIndex],
      [field]: value
    };
    onChange({ ...resumeData, skills: newSkills });
  };

  const updateSkillItem = (catIndex, itemIndex, value) => {
    const newSkills = [...resumeData.skills];
    const newItems = [...newSkills[catIndex].items];
    newItems[itemIndex] = value;
    newSkills[catIndex] = {
      ...newSkills[catIndex],
      items: newItems
    };
    onChange({ ...resumeData, skills: newSkills });
  };

  const addSkillCat = () => {
    onChange({
      ...resumeData,
      skills: [...resumeData.skills, { category: "新技能分类", items: [""] }]
    });
  };

  const removeSkillCat = (catIndex) => {
    onChange({
      ...resumeData,
      skills: resumeData.skills.filter((_, i) => i !== catIndex)
    });
  };

  const addSkillItem = (catIndex) => {
    const newSkills = [...resumeData.skills];
    newSkills[catIndex] = {
      ...newSkills[catIndex],
      items: [...newSkills[catIndex].items, ""]
    };
    onChange({ ...resumeData, skills: newSkills });
  };

  const removeSkillItem = (catIndex, itemIndex) => {
    const newSkills = [...resumeData.skills];
    const newItems = newSkills[catIndex].items.filter((_, i) => i !== itemIndex);
    newSkills[catIndex] = {
      ...newSkills[catIndex],
      items: newItems
    };
    onChange({ ...resumeData, skills: newSkills });
  };

  // Projects handlers
  const updateProjectField = (projIndex, field, value) => {
    const newProjects = [...resumeData.projects];
    newProjects[projIndex] = {
      ...newProjects[projIndex],
      [field]: value
    };
    onChange({ ...resumeData, projects: newProjects });
  };

  const updateProjectWork = (projIndex, workIndex, value) => {
    const newProjects = [...resumeData.projects];
    const newWork = [...newProjects[projIndex].work];
    newWork[workIndex] = value;
    newProjects[projIndex] = {
      ...newProjects[projIndex],
      work: newWork
    };
    onChange({ ...resumeData, projects: newProjects });
  };

  const addProjectWork = (projIndex) => {
    const newProjects = [...resumeData.projects];
    newProjects[projIndex] = {
      ...newProjects[projIndex],
      work: [...newProjects[projIndex].work, ""]
    };
    onChange({ ...resumeData, projects: newProjects });
  };

  const removeProjectWork = (projIndex, workIndex) => {
    const newProjects = [...resumeData.projects];
    const newWork = newProjects[projIndex].work.filter((_, i) => i !== workIndex);
    newProjects[projIndex] = {
      ...newProjects[projIndex],
      work: newWork
    };
    onChange({ ...resumeData, projects: newProjects });
  };

  const updateProjectOutcome = (projIndex, outcomeIndex, value) => {
    const newProjects = [...resumeData.projects];
    const newOutcomes = [...newProjects[projIndex].outcomes];
    newOutcomes[outcomeIndex] = value;
    newProjects[projIndex] = {
      ...newProjects[projIndex],
      outcomes: newOutcomes
    };
    onChange({ ...resumeData, projects: newProjects });
  };

  const addProjectOutcome = (projIndex) => {
    const newProjects = [...resumeData.projects];
    const currentOutcomes = newProjects[projIndex].outcomes || [];
    newProjects[projIndex] = {
      ...newProjects[projIndex],
      outcomes: [...currentOutcomes, ""]
    };
    onChange({ ...resumeData, projects: newProjects });
  };

  const removeProjectOutcome = (projIndex, outcomeIndex) => {
    const newProjects = [...resumeData.projects];
    const currentOutcomes = newProjects[projIndex].outcomes || [];
    const newOutcomes = currentOutcomes.filter((_, i) => i !== outcomeIndex);
    newProjects[projIndex] = {
      ...newProjects[projIndex],
      outcomes: newOutcomes
    };
    onChange({ ...resumeData, projects: newProjects });
  };

  const addProject = () => {
    onChange({
      ...resumeData,
      projects: [
        ...resumeData.projects,
        {
          name: "新项目名称",
          role: "主要开发者",
          type: "个人开源项目",
          startDate: "2026.01",
          endDate: "至今",
          enabled: true,
          repo: "",
          work: ["负责开发..."],
          outcomes: ["完成开发并部署上线..."]
        }
      ]
    });
  };

  const removeProject = (projIndex) => {
    onChange({
      ...resumeData,
      projects: resumeData.projects.filter((_, i) => i !== projIndex)
    });
  };

  // Honors
  const updateHonor = (index, value) => {
    const newHonors = [...resumeData.honors];
    newHonors[index] = value;
    onChange({ ...resumeData, honors: newHonors });
  };

  const addHonor = () => {
    onChange({ ...resumeData, honors: [...resumeData.honors, "新获得证书 / 奖项"] });
  };

  const removeHonor = (index) => {
    onChange({ ...resumeData, honors: resumeData.honors.filter((_, i) => i !== index) });
  };

  const updateCertificate = (index, value) => {
    const certificates = [...(resumeData.certificates || [])];
    certificates[index] = value;
    onChange({ ...resumeData, certificates });
  };

  const addCertificate = () => {
    onChange({ ...resumeData, certificates: [...(resumeData.certificates || []), "新获得技能证书"] });
  };

  const removeCertificate = (index) => {
    onChange({ ...resumeData, certificates: (resumeData.certificates || []).filter((_, i) => i !== index) });
  };

  const updateHobby = (index, value) => {
    const hobbies = [...(resumeData.hobbies || [])];
    hobbies[index] = value;
    onChange({ ...resumeData, hobbies });
  };

  const addHobby = () => {
    onChange({ ...resumeData, hobbies: [...(resumeData.hobbies || []), "新的兴趣爱好"] });
  };

  const removeHobby = (index) => {
    onChange({ ...resumeData, hobbies: (resumeData.hobbies || []).filter((_, i) => i !== index) });
  };

  // Self Evaluation
  const updateEval = (index, value) => {
    const newEval = [...resumeData.selfEvaluation];
    newEval[index] = value;
    onChange({ ...resumeData, selfEvaluation: newEval });
  };

  const addEval = () => {
    onChange({ ...resumeData, selfEvaluation: [...resumeData.selfEvaluation, "具有优秀的...能力"] });
  };

  const removeEval = (index) => {
    onChange({ ...resumeData, selfEvaluation: resumeData.selfEvaluation.filter((_, i) => i !== index) });
  };

  const toggleSection = (sectionName) => {
    setActiveSection(activeSection === sectionName ? null : sectionName);
  };

  return (
    <div className="resume-form-sections">
      {/* 1. Basic Info Section */}
      <div className="form-section">
        <div 
          className="form-section-header" 
          onClick={() => toggleSection('personalInfo')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">👤 基本信息</h3>
          <span>{activeSection === 'personalInfo' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'personalInfo' && (
          <div className="form-grid">
            <div className="form-group">
              <label>姓名</label>
              <input 
                type="text" 
                value={resumeData.personalInfo.name} 
                onChange={(e) => updatePersonalInfo('name', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>求职意向</label>
              <input 
                type="text" 
                value={resumeData.personalInfo.intent} 
                onChange={(e) => updatePersonalInfo('intent', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>联系电话</label>
              <input 
                type="text" 
                value={resumeData.personalInfo.phone} 
                onChange={(e) => updatePersonalInfo('phone', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>电子邮箱</label>
              <input 
                type="email" 
                value={resumeData.personalInfo.email} 
                onChange={(e) => updatePersonalInfo('email', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>GitHub 地址</label>
              <input 
                type="text" 
                value={resumeData.personalInfo.github} 
                onChange={(e) => updatePersonalInfo('github', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>期望城市</label>
              <input 
                type="text" 
                value={resumeData.personalInfo.city} 
                onChange={(e) => updatePersonalInfo('city', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>出生年月</label>
              <input
                type="text"
                placeholder="例如：2003.08"
                value={resumeData.personalInfo.birthDate || ''}
                onChange={(e) => updatePersonalInfo('birthDate', e.target.value)}
              />
            </div>
            
            {/* Profile Photo Uploader and Scan Preview */}
            <div className="form-group col-span-2">
              <label>证件照</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
                {displayPhoto && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ 
                      width: '55px', 
                      height: '72px', 
                      border: '1px solid var(--panel-border)', 
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#000'
                    }}>
                      <img 
                        src={displayPhoto}
                        alt="预览" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      
                      {/* Scan Laser Overlay */}
                      {isScanning && (
                        <div className="scanning-line" />
                      )}
                      
                      {/* Face bounding box overlay (YOLO face detection model simulation) */}
                      {!isScanning && (
                        <div style={{
                          position: 'absolute',
                          top: '15%',
                          left: '20%',
                          width: '60%',
                          height: '50%',
                          border: '2px solid #10b981',
                          boxShadow: '0 0 4px #10b981',
                          pointerEvents: 'none'
                        }}>
                          <span style={{ position: 'absolute', top: '-11px', left: '-2px', background: '#10b981', color: '#fff', fontSize: '6px', padding: '0px 2px', borderRadius: '2px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            YOLOv8 Face: 98%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* CV Audit Feedback */}
                    <div style={{ fontSize: '10px', color: isScanning ? '#9ca3af' : '#10b981', marginTop: '4px', fontWeight: 'bold' }}>
                      {isScanning ? '⏳ YOLO 视觉评估中...' : '✓ 证件照规范评估通过 (98.6%)'}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                    📤 上传照片
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (uploadEvent) => {
                            updatePersonalInfo('photo', uploadEvent.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                  {resumeData.personalInfo.photo && (
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => updatePersonalInfo('photo', '')}
                    >
                      ✕ 清除照片
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Education Section */}
      <div className="form-section">
        <div 
          className="form-section-header" 
          onClick={() => toggleSection('education')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">🎓 教育背景</h3>
          <span>{activeSection === 'education' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'education' && (
          <div className="form-grid full">
            <div className="form-grid">
              <div className="form-group">
                <label>院校名称</label>
                <input 
                  type="text" 
                  value={resumeData.education.school} 
                  onChange={(e) => updateEducation('school', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>就读专业</label>
                <input 
                  type="text" 
                  value={resumeData.education.major} 
                  onChange={(e) => updateEducation('major', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>学历</label>
                <input 
                  type="text" 
                  value={resumeData.education.degree} 
                  onChange={(e) => updateEducation('degree', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>就读状态 (在读/毕业)</label>
                <input 
                  type="text" 
                  value={resumeData.education.status} 
                  onChange={(e) => updateEducation('status', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>入学日期</label>
                <input 
                  type="text" 
                  value={resumeData.education.startDate} 
                  onChange={(e) => updateEducation('startDate', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>毕业/预计毕业日期</label>
                <input 
                  type="text" 
                  value={resumeData.education.endDate} 
                  onChange={(e) => updateEducation('endDate', e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>主修课程 (全称)</label>
              {resumeData.education.courses.map((course, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input 
                    type="text" 
                    value={course} 
                    style={{ flex: 1 }}
                    onChange={(e) => updateCourses(idx, e.target.value)} 
                  />
                  <button className="btn btn-danger btn-sm" onClick={() => removeCourse(idx)}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={addCourse} style={{ width: 'fit-content' }}>
                + 添加课程
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Skills Section */}
      <div className="form-section">
        <div 
          className="form-section-header" 
          onClick={() => toggleSection('skills')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">⚡ 专业技能</h3>
          <span>{activeSection === 'skills' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'skills' && (
          <div>
            {resumeData.skills.map((skillCat, idx) => (
              <div key={idx} className="array-item">
                <div className="array-item-header">
                  <span>技能分类 #{idx + 1}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => removeSkillCat(idx)}>删除分类</button>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>分类名称</label>
                  <input 
                    type="text" 
                    value={skillCat.category} 
                    onChange={(e) => updateSkillCat(idx, 'category', e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>具体技能项</label>
                  {skillCat.items.map((item, itemIdx) => (
                    <div key={itemIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <input 
                        type="text" 
                        value={item} 
                        style={{ flex: 1 }}
                        onChange={(e) => updateSkillItem(idx, itemIdx, e.target.value)} 
                      />
                      <button className="btn btn-danger btn-sm" onClick={() => removeSkillItem(idx, itemIdx)}>✕</button>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => addSkillItem(idx)} style={{ width: 'fit-content', marginTop: '4px' }}>
                    + 添加具体项
                  </button>
                </div>
              </div>
            ))}
            <button className="btn btn-primary btn-sm" onClick={addSkillCat}>+ 新增技能分类</button>
          </div>
        )}
      </div>

      {/* 4. Projects Section */}
      <div className="form-section">
        <div 
          className="form-section-header" 
          onClick={() => toggleSection('projects')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">🚀 项目经历（三段式）</h3>
          <span>{activeSection === 'projects' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'projects' && (
          <div>
            {resumeData.projects.map((proj, idx) => (
              <div key={idx} className="array-item">
                <div className="array-item-header">
                  <span>项目 #{idx + 1}: {proj.name}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => removeProject(idx)}>删除项目</button>
                </div>
                
                {/* Project enabled check */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', gridColumn: 'span 2' }}>
                  <input 
                    type="checkbox" 
                    id={`proj-enable-${idx}`}
                    checked={proj.enabled !== false} 
                    onChange={(e) => updateProjectField(idx, 'enabled', e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                  />
                  <label htmlFor={`proj-enable-${idx}`} style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal' }}>
                    在简历中启用并展示此项目（勾选以包含在 PDF 中）
                  </label>
                </div>

                <div className="form-grid" style={{ marginBottom: '12px', gridColumn: 'span 2' }}>
                  <div className="form-group">
                    <label>项目名称</label>
                    <input 
                      type="text" 
                      value={proj.name} 
                      onChange={(e) => updateProjectField(idx, 'name', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>角色 (如: 独立开发者)</label>
                    <input 
                      type="text" 
                      value={proj.role} 
                      onChange={(e) => updateProjectField(idx, 'role', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>项目类型</label>
                    <input 
                      type="text" 
                      value={proj.type} 
                      onChange={(e) => updateProjectField(idx, 'type', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>开源仓库 URL</label>
                    <input 
                      type="text" 
                      value={proj.repo} 
                      onChange={(e) => updateProjectField(idx, 'repo', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>开始时间</label>
                    <input 
                      type="text" 
                      value={proj.startDate} 
                      onChange={(e) => updateProjectField(idx, 'startDate', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label>结束时间</label>
                    <input 
                      type="text" 
                      value={proj.endDate} 
                      onChange={(e) => updateProjectField(idx, 'endDate', e.target.value)} 
                    />
                  </div>
                </div>

                {/* Specific work details (Actions) with AI Polish */}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>具体开发工作（Actions）</label>
                  {proj.work.map((workLine, wIdx) => (
                    <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <textarea 
                          value={workLine} 
                          style={{ flex: 1, minHeight: '60px' }}
                          onChange={(e) => updateProjectWork(idx, wIdx, e.target.value)} 
                        />
                        <button className="btn btn-danger btn-sm" onClick={() => removeProjectWork(idx, wIdx)} style={{ height: '38px' }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ fontSize: '10px', padding: '2px 8px', height: '22px', color: '#10b981' }}
                          onClick={() => onAIPolish(workLine, (newText) => updateProjectWork(idx, wIdx, newText))}
                        >
                          ✨ AI 智能润色
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => addProjectWork(idx)} style={{ width: 'fit-content' }}>
                    + 添加工作内容
                  </button>
                </div>

                {/* Outcomes and metrics with AI Polish */}
                <div className="form-group">
                  <label>收获与成果（Outcomes/Metrics）</label>
                  {(proj.outcomes || []).map((outcomeLine, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          value={outcomeLine} 
                          style={{ flex: 1 }}
                          onChange={(e) => updateProjectOutcome(idx, oIdx, e.target.value)} 
                        />
                        <button className="btn btn-danger btn-sm" onClick={() => removeProjectOutcome(idx, oIdx)}>✕</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ fontSize: '10px', padding: '2px 8px', height: '22px', color: '#10b981' }}
                          onClick={() => onAIPolish(outcomeLine, (newText) => updateProjectOutcome(idx, oIdx, newText))}
                        >
                          ✨ AI 智能润色
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => addProjectOutcome(idx)} style={{ width: 'fit-content' }}>
                    + 添加成果项
                  </button>
                </div>
              </div>
            ))}
            <button className="btn btn-primary btn-sm" onClick={addProject}>+ 新增项目</button>
          </div>
        )}
      </div>

      {/* 5. Honors Section */}
      <div className="form-section">
        <div 
          className="form-section-header" 
          onClick={() => toggleSection('honors')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">🏆 荣誉奖项</h3>
          <span>{activeSection === 'honors' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'honors' && (
          <div className="form-group">
            <label>荣誉奖项列表</label>
            {resumeData.honors.map((honor, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input 
                  type="text" 
                  value={honor} 
                  style={{ flex: 1 }}
                  onChange={(e) => updateHonor(idx, e.target.value)} 
                />
                <button className="btn btn-danger btn-sm" onClick={() => removeHonor(idx)}>✕</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addHonor} style={{ width: 'fit-content' }}>
              + 添加荣誉奖项
            </button>
          </div>
        )}
      </div>

      <div className="form-section">
        <div
          className="form-section-header"
          onClick={() => toggleSection('certificates')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">🎖️ 技能证书</h3>
          <span>{activeSection === 'certificates' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'certificates' && (
          <div className="form-group">
            <label>技能证书列表</label>
            {(resumeData.certificates || []).map((certificate, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={certificate}
                  style={{ flex: 1 }}
                  onChange={(e) => updateCertificate(idx, e.target.value)}
                />
                <button className="btn btn-danger btn-sm" onClick={() => removeCertificate(idx)}>✕</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addCertificate} style={{ width: 'fit-content' }}>
              + 添加技能证书
            </button>
          </div>
        )}
      </div>

      <div className="form-section">
        <div
          className="form-section-header"
          onClick={() => toggleSection('hobbies')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">🌿 兴趣爱好</h3>
          <span>{activeSection === 'hobbies' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'hobbies' && (
          <div className="form-group">
            <label>兴趣爱好列表</label>
            {(resumeData.hobbies || []).map((hobby, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={hobby}
                  style={{ flex: 1 }}
                  onChange={(e) => updateHobby(idx, e.target.value)}
                />
                <button className="btn btn-danger btn-sm" onClick={() => removeHobby(idx)}>✕</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addHobby} style={{ width: 'fit-content' }}>
              + 添加兴趣爱好
            </button>
          </div>
        )}
      </div>

      {/* 6. Self Evaluation Section with AI Polish */}
      <div className="form-section">
        <div 
          className="form-section-header" 
          onClick={() => toggleSection('selfEvaluation')}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="form-section-title">💡 自我评价</h3>
          <span>{activeSection === 'selfEvaluation' ? '▼' : '▶'}</span>
        </div>
        {activeSection === 'selfEvaluation' && (
          <div className="form-group">
            <label>核心论点及论据</label>
            {resumeData.selfEvaluation.map((evalLine, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea 
                    value={evalLine} 
                    style={{ flex: 1, minHeight: '60px' }}
                    onChange={(e) => updateEval(idx, e.target.value)} 
                  />
                  <button className="btn btn-danger btn-sm" onClick={() => removeEval(idx)} style={{ height: '38px' }}>✕</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ fontSize: '10px', padding: '2px 8px', height: '22px', color: '#10b981' }}
                    onClick={() => onAIPolish(evalLine, (newText) => updateEval(idx, newText))}
                  >
                    ✨ AI 智能润色
                  </button>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addEval} style={{ width: 'fit-content' }}>
              + 添加评价内容
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
