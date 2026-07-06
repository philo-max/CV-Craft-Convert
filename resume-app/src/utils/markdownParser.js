/**
 * Converts the structured resume JSON data into standard Markdown text
 */
export function jsonToMarkdown(data) {
  const { personalInfo, education, skills, projects, honors, selfEvaluation } = data;

  let md = `# ${personalInfo.name}\n\n`;
  md += `**求职意向**：${personalInfo.intent}  \n`;
  md += `**联系电话**：${personalInfo.phone}  \n`;
  md += `**电子邮箱**：${personalInfo.email}  \n`;
  md += `**GitHub**：[${personalInfo.github}](https://${personalInfo.github})  \n`;
  if (personalInfo.city) {
    md += `**期望城市**：${personalInfo.city}  \n`;
  }
  md += `\n---\n\n`;

  // Education & Skills Section
  md += `## ▍ 教育背景 & 专业技能\n\n`;
  md += `### 教育背景\n`;
  md += `* **${education.school}** | ${education.major} · ${education.degree} · ${education.startDate} – ${education.endDate}（${education.status}）\n`;
  md += `* **主修课程**：${education.courses.join('、')}\n\n`;

  md += `### 专业技能\n`;
  skills.forEach(skill => {
    md += `* **${skill.category}**：${skill.items.join('；')}\n`;
  });
  md += `\n---\n\n`;

  // Projects Section
  md += `## ▍ 开源项目与实践经历\n\n`;
  projects.forEach((proj, idx) => {
    md += `### ${idx + 1}. ${proj.name}（${proj.type}）\n`;
    md += `* **时间与角色**：${proj.startDate} – ${proj.endDate} | ${proj.role}\n`;
    if (proj.repo) {
      md += `* **开源仓库**：[${proj.repo}](${proj.repo.startsWith('http') ? proj.repo : 'https://' + proj.repo})\n`;
    }
    
    if (proj.work && proj.work.length > 0) {
      md += `* **具体工作**：\n`;
      proj.work.forEach(line => {
        md += `  * ${line}\n`;
      });
    }
    
    if (proj.outcomes && proj.outcomes.length > 0) {
      md += `* **收获与成果**：\n`;
      proj.outcomes.forEach(line => {
        md += `  * ${line}\n`;
      });
    }
    md += `\n`;
  });
  md += `---\n\n`;

  // Honors Section
  if (honors && honors.length > 0) {
    md += `## ▍ 荣誉与证书\n\n`;
    honors.forEach(honor => {
      md += `* ${honor}\n`;
    });
    md += `\n---\n\n`;
  }

  // Self Evaluation Section
  if (selfEvaluation && selfEvaluation.length > 0) {
    md += `## ▍ 自我评价\n\n`;
    selfEvaluation.forEach((evalLine, idx) => {
      md += `${idx + 1}. ${evalLine}\n`;
    });
  }

  return md;
}

/**
 * Parses Markdown text and converts it back into structured resume JSON
 */
export function markdownToJson(md) {
  const lines = md.split('\n');
  
  const result = {
    personalInfo: { name: "", intent: "", phone: "", email: "", github: "", city: "" },
    education: { school: "", major: "", degree: "", startDate: "", endDate: "", status: "", courses: [] },
    skills: [],
    projects: [],
    honors: [],
    selfEvaluation: []
  };

  let currentSection = "";
  let currentProject = null;
  let inWorkList = false;
  let inOutcomesList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Parse Name (Header #)
    if (line.startsWith('# ')) {
      result.personalInfo.name = line.substring(2).trim();
      continue;
    }

    // 2. Parse Personal Info fields
    if (line.includes('**求职意向**')) {
      const match = line.match(/\*\*求职意向\*\*[:：]\s*(.*)/);
      if (match) result.personalInfo.intent = match[1].replace(/  $/, '').trim();
      continue;
    }
    if (line.includes('**联系电话**')) {
      const match = line.match(/\*\*联系电话\*\*[:：]\s*(.*)/);
      if (match) result.personalInfo.phone = match[1].replace(/  $/, '').trim();
      continue;
    }
    if (line.includes('**电子邮箱**')) {
      const match = line.match(/\*\*电子邮箱\*\*[:：]\s*(.*)/);
      if (match) result.personalInfo.email = match[1].replace(/  $/, '').trim();
      continue;
    }
    if (line.includes('**GitHub**')) {
      // Check for link pattern [text](url) or plain text
      const match = line.match(/\*\*GitHub\*\*[:：]\s*(.*)/);
      if (match) {
        let val = match[1].replace(/  $/, '').trim();
        const linkMatch = val.match(/\[(.*?)\]/);
        result.personalInfo.github = linkMatch ? linkMatch[1] : val;
      }
      continue;
    }
    if (line.includes('**期望城市**')) {
      const match = line.match(/\*\*期望城市\*\*[:：]\s*(.*)/);
      if (match) result.personalInfo.city = match[1].replace(/  $/, '').trim();
      continue;
    }

    // 3. Section detection
    if (line.startsWith('## ')) {
      const secTitle = line.substring(3).trim();
      if (secTitle.includes('教育背景') || secTitle.includes('专业技能')) {
        currentSection = "edu_skills";
      } else if (secTitle.includes('项目') || secTitle.includes('经历')) {
        currentSection = "projects";
      } else if (secTitle.includes('荣誉') || secTitle.includes('证书')) {
        currentSection = "honors";
      } else if (secTitle.includes('自我评价')) {
        currentSection = "evaluation";
      }
      continue;
    }

    // Secondary headings
    if (line.startsWith('### ')) {
      const subTitle = line.substring(4).trim();
      if (subTitle.includes('教育背景')) {
        currentSection = "education";
      } else if (subTitle.includes('专业技能')) {
        currentSection = "skills";
      } else if (currentSection === "projects") {
        // This is a project header: "### 1. Project Name (Type)" or "### Project Name"
        // Let's finish the previous project if any
        if (currentProject) {
          result.projects.push(currentProject);
        }
        
        inWorkList = false;
        inOutcomesList = false;

        let name = subTitle;
        let type = "个人项目";
        
        // Strip numbering like "1. "
        name = name.replace(/^\d+[\.\s\-]+/, '');
        
        // Parse type if in parentheses like "（独撰开源项目）" or "(个人开源项目)"
        const typeMatch = name.match(/[\(\（](.*?)[\)\）]/);
        if (typeMatch) {
          type = typeMatch[1];
          name = name.replace(/[\(\（].*?[\)\）]/, '').trim();
        }

        currentProject = {
          name: name.trim(),
          role: "开发者",
          type: type,
          startDate: "2026.01",
          endDate: "至今",
          repo: "",
          work: [],
          outcomes: []
        };
      }
      continue;
    }

    // Bullet parsing based on sections
    if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ') || line.startsWith('5. ') || line.startsWith('6. ')) {
      const bulletContent = line.replace(/^[\*\-\d\.\s]+/, '').trim();

      if (currentSection === "education") {
        if (bulletContent.includes('主修课程')) {
          const coursesMatch = bulletContent.match(/主修课程[:：]\s*(.*)/);
          if (coursesMatch) {
            result.education.courses = coursesMatch[1].split(/[、,，]/).map(c => c.trim());
          }
        } else {
          // School line: * **北京财贸职业学院** | 人工智能技术应用专业 · 专科 · 2024.09 – 2027.06（在读）
          const schoolMatch = bulletContent.match(/\*\*(.*?)\*\*/);
          if (schoolMatch) {
            result.education.school = schoolMatch[1];
          }
          
          const parts = bulletContent.split('|');
          if (parts.length > 1) {
            const details = parts[1].split(/[·•]/);
            if (details.length > 0) result.education.major = details[0].trim();
            if (details.length > 1) result.education.degree = details[1].trim();
            
            // Extract dates and status
            const dateStatusPart = details[details.length - 1] || "";
            const dateMatch = dateStatusPart.match(/(\d{4}\.\d{2})\s*[\-–—]\s*(\d{4}\.\d{2}|至今)/);
            if (dateMatch) {
              result.education.startDate = dateMatch[1];
              result.education.endDate = dateMatch[2];
            }
            
            const statusMatch = dateStatusPart.match(/[（(](.*?)[)）]/);
            if (statusMatch) {
              result.education.status = statusMatch[1];
            }
          }
        }
      } 
      else if (currentSection === "skills") {
        // Skill line: * **编程语言 & 数据库**：精通 Python...；熟悉 Java...
        const catMatch = bulletContent.match(/\*\*(.*?)\*\*/);
        if (catMatch) {
          const catName = catMatch[1];
          const itemsPart = bulletContent.replace(/\*\*(.*?)\*\*[:：]/, '').trim();
          const items = itemsPart.split(/[;；]/).map(item => item.trim()).filter(Boolean);
          result.skills.push({
            category: catName,
            items: items
          });
        }
      } 
      else if (currentSection === "projects" && currentProject) {
        if (bulletContent.includes('时间与角色')) {
          const match = bulletContent.match(/时间与角色[:：]\s*(.*)/);
          if (match) {
            const val = match[1].trim();
            const parts = val.split('|');
            if (parts.length > 0) {
              const dateMatch = parts[0].match(/(\d{4}\.\d{2})\s*[\-–—]\s*(\d{4}\.\d{2}|至今|.+?)(?=\s|$)/);
              if (dateMatch) {
                currentProject.startDate = dateMatch[1];
                currentProject.endDate = dateMatch[2];
              }
            }
            if (parts.length > 1) {
              currentProject.role = parts[1].trim();
            }
          }
        } 
        else if (bulletContent.includes('开源仓库')) {
          const match = bulletContent.match(/开源仓库[:：]\s*(.*)/);
          if (match) {
            let val = match[1].trim();
            const linkMatch = val.match(/\[(.*?)\]/);
            currentProject.repo = linkMatch ? linkMatch[1] : val;
          }
        }
        else if (bulletContent.includes('具体工作')) {
          inWorkList = true;
          inOutcomesList = false;
        }
        else if (bulletContent.includes('收获与成果')) {
          inWorkList = false;
          inOutcomesList = true;
        }
        else {
          // It's a list item under work or outcomes
          if (inWorkList) {
            currentProject.work.push(bulletContent);
          } else if (inOutcomesList) {
            currentProject.outcomes.push(bulletContent);
          } else {
            // Default to work if not specified
            currentProject.work.push(bulletContent);
          }
        }
      }
      else if (currentSection === "honors") {
        result.honors.push(bulletContent);
      }
      else if (currentSection === "evaluation") {
        result.selfEvaluation.push(bulletContent);
      }
    } 
    // Nested sub-bullets parser (e.g. spaces followed by bullet)
    else if (lines[i].startsWith('  ') || lines[i].startsWith('\t')) {
      const nestedLine = lines[i].trim();
      if ((nestedLine.startsWith('* ') || nestedLine.startsWith('- ')) && currentSection === "projects" && currentProject) {
        const bulletContent = nestedLine.replace(/^[\*\-\s]+/, '').trim();
        if (inWorkList) {
          currentProject.work.push(bulletContent);
        } else if (inOutcomesList) {
          currentProject.outcomes.push(bulletContent);
        } else {
          currentProject.work.push(bulletContent);
        }
      }
    }
  }

  // Push the final project
  if (currentProject) {
    result.projects.push(currentProject);
  }

  return result;
}
