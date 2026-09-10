import React, { useState, useEffect, useCallback } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { check } from '@tauri-apps/plugin-updater';
import { defaultResume } from './data/defaultResume';
import ResumeForm from './components/ResumeForm';
import ResumePreview from './components/ResumePreview';
import RawEditor from './components/RawEditor';
import { jsonToMarkdown, markdownToJson } from './utils/markdownParser';

const RESUME_STORAGE_KEY = 'cv-craft-resume';
const LAYOUT_STORAGE_KEY = 'cv-craft-layout';
const HISTORY_STORAGE_KEY = 'cv-craft-history';
const MAX_HISTORY_RECORDS = 20;
const MAX_HISTORY_PHOTO_LENGTH = 500000;

const RESUME_TEMPLATES = [
  {
    id: 'business',
    name: '商务标准',
    description: '双栏 · 清晰信息层级',
    accent: '#1e3a8a',
    config: { accentColor: '#1e3a8a', dividerColor: '#94a3b8', bgColor: '#ffffff', textColor: '#1f2937', layoutStyle: 'double', fontFamily: 'Microsoft YaHei', titleStyle: 'leftbar', density: 'comfortable', lineHeight: 1.55, sectionMargin: 16, itemMargin: 12 }
  },
  {
    id: 'office',
    name: '经典文档',
    description: '单栏 · Office 风格',
    accent: '#334155',
    config: { accentColor: '#334155', dividerColor: '#64748b', bgColor: '#ffffff', textColor: '#1f2937', layoutStyle: 'single', fontFamily: 'DengXian', titleStyle: 'bottomline', density: 'comfortable', lineHeight: 1.6, sectionMargin: 18, itemMargin: 12 }
  },
  {
    id: 'minimal',
    name: '极简留白',
    description: '单栏 · 适合创意岗位',
    accent: '#0f766e',
    config: { accentColor: '#0f766e', dividerColor: '#99f6e4', bgColor: '#ffffff', textColor: '#27303a', layoutStyle: 'single', fontFamily: 'Noto Sans SC', titleStyle: 'plain', density: 'comfortable', lineHeight: 1.7, sectionMargin: 20, itemMargin: 14 }
  }
];

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

const DEFAULT_LAYOUT_CONFIG = {
  templateId: 'business',
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
  borderRadius: 6,
  fieldStyles: {}
};

const isTauriApp = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const isOversizedPhoto = (photo) => typeof photo === 'string'
  && photo.startsWith('data:image/')
  && photo.length > MAX_HISTORY_PHOTO_LENGTH;

const triggerDownload = (url, filename, revokeUrl = false) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  if (revokeUrl) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const saveExportFile = async (filename, extension, content) => {
  if (!isTauriApp()) return false;
  try {
    const path = await save({
      defaultPath: filename,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
    });
    if (!path) return true;
    if (typeof content === 'string') {
      await writeTextFile(path, content);
    } else {
      await writeFile(path, content);
    }
    return true;
  } catch (error) {
    console.error('Native export failed:', error);
    alert(`保存文件失败：${error.message || '请重新选择保存位置'}`);
    return true;
  }
};

const normalizeResumeData = (data) => ({
  ...data,
  personalInfo: {
    ...data.personalInfo,
    birthDate: data.personalInfo?.birthDate || ''
  },
  honors: Array.isArray(data.honors) ? data.honors : [],
  certificates: Array.isArray(data.certificates) ? data.certificates : [],
  hobbies: Array.isArray(data.hobbies) ? data.hobbies : []
});

const loadStoredResume = () => {
  try {
    const savedResume = localStorage.getItem(RESUME_STORAGE_KEY);
    return savedResume ? normalizeResumeData(JSON.parse(savedResume)) : defaultResume;
  } catch {
    return defaultResume;
  }
};

const loadStoredLayoutConfig = () => {
  try {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return savedLayout ? { ...DEFAULT_LAYOUT_CONFIG, ...JSON.parse(savedLayout) } : DEFAULT_LAYOUT_CONFIG;
  } catch {
    return DEFAULT_LAYOUT_CONFIG;
  }
};

const loadHistoryRecords = () => {
  try {
    const savedHistory = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    if (!Array.isArray(savedHistory)) return [];
    return savedHistory.map((record) => {
      try {
        const snapshot = JSON.parse(record.snapshot);
        if (!isOversizedPhoto(snapshot.personalInfo?.photo)) return record;
        return {
          ...record,
          snapshot: JSON.stringify({
            ...snapshot,
            personalInfo: { ...snapshot.personalInfo, photo: '' }
          })
        };
      } catch {
        return record;
      }
    });
  } catch {
    return [];
  }
};

const updateResumeField = (data, path, value) => {
  const keys = path.split('.');
  const updateBranch = (branch, index) => {
    const key = Number.isNaN(Number(keys[index])) ? keys[index] : Number(keys[index]);
    const copy = Array.isArray(branch) ? [...branch] : { ...branch };
    copy[key] = index === keys.length - 1 ? value : updateBranch(branch[key], index + 1);
    return copy;
  };
  return updateBranch(data, 0);
};

const createProject = () => ({
  name: '新项目名称',
  role: '主要开发者',
  type: '个人开源项目',
  startDate: '2026.01',
  endDate: '至今',
  enabled: true,
  repo: '',
  work: ['负责开发...'],
  outcomes: ['完成开发并部署上线...']
});

const parseLLMResponse = (responseText) => {
  if (typeof responseText !== 'string' || !responseText.trim()) return [];
  const jsonText = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed.options)) return [];
    return parsed.options
      .filter((option) => typeof option === 'string')
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
};

export default function App() {
  const [resumeData, setResumeData] = useState(loadStoredResume);
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' or 'raw'
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [showStyleDesigner, setShowStyleDesigner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRecords, setHistoryRecords] = useState(loadHistoryRecords);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(null);

  const handlePreviewFieldChange = useCallback((path, value) => {
    const nextValue = path === 'education.courses'
      ? value.split('、').map((course) => course.trim()).filter(Boolean)
      : value;
    setResumeData((data) => updateResumeField(data, path, nextValue));
  }, []);

  const handleAddProjectFromPreview = useCallback(() => {
    setResumeData((data) => ({ ...data, projects: [...data.projects, createProject()] }));
  }, []);

  const handleDeleteProjectFromPreview = useCallback((index) => {
    setResumeData((data) => ({ ...data, projects: data.projects.filter((_, projectIndex) => projectIndex !== index) }));
  }, []);

  const handlePreviewStyleChange = useCallback((path, style) => {
    setLayoutConfig((config) => ({
      ...config,
      fieldStyles: { ...(config.fieldStyles || {}), [path]: { ...(config.fieldStyles?.[path] || {}), ...style } }
    }));
  }, []);

  // Click outside listener to close the export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownOpen && !event.target.closest('.export-dropdown-container')) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [exportDropdownOpen]);
  const [theme, setTheme] = useState('dark');
  
  const [layoutConfig, setLayoutConfig] = useState(loadStoredLayoutConfig);

  // Modular Layout Sections Order
  const [sections, setSections] = useState([
    { id: 'education', name: '🎓 教育背景', col: 'left', order: 0 },
    { id: 'skills', name: '⚡ 专业技能', col: 'left', order: 1 },
    { id: 'honors', name: '🏆 荣誉奖项', col: 'left', order: 2 },
    { id: 'certificates', name: '🎖️ 技能证书', col: 'left', order: 3 },
    { id: 'hobbies', name: '🌿 兴趣爱好', col: 'left', order: 4 },
    { id: 'projects', name: '🚀 项目经历', col: 'right', order: 0 },
    { id: 'selfEvaluation', name: '💡 自我评价', col: 'right', order: 1 }
  ]);

  // AI Connection configuration
  const [aiConfig, setAiConfig] = useState({
    engine: 'lmstudio',
    endpoint: 'http://127.0.0.1:1234/v1',
    model: 'google/gemma-4-12b-qat',
    apiKey: '',
    showSettings: false
  });
  const [lmStudioStatus, setLmStudioStatus] = useState('idle');
  const [lmStudioError, setLmStudioError] = useState('');

  const checkLmStudioConnection = useCallback(async () => {
    setLmStudioStatus('checking');
    setLmStudioError('');
    try {
      const response = await fetch(`${aiConfig.endpoint.replace(/\/$/, '')}/models`);
      if (!response.ok) throw new Error(`服务返回 ${response.status}`);
      const data = await response.json();
      const modelIds = (data.data || []).map((model) => model.id);
      if (!modelIds.length) throw new Error('未发现已加载的模型');
      if (aiConfig.model && !modelIds.includes(aiConfig.model)) throw new Error(`未发现模型：${aiConfig.model}`);
      setLmStudioStatus('connected');
    } catch (error) {
      setLmStudioStatus('error');
      setLmStudioError(error.message || '无法连接本地服务');
    }
  }, [aiConfig.endpoint, aiConfig.model]);

  // AI Polish Modal State
  const [polishModal, setPolishModal] = useState({
    isOpen: false,
    text: '',
    onSave: null,
    generatedOptions: []
  });

  // BGE-M3 Semantic Search Matcher State
  const [jdText, setJdText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [showMatcher, setShowMatcher] = useState(false);

  // Web Audio BGM Synthesizer State (Rain Sound)
  const [bgmActive, setBgmActive] = useState(false);
  const [audioCtx, setAudioCtx] = useState(null);
  const [noiseSource, setNoiseSource] = useState(null);

  // Sync theme to root html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const photo = resumeData.personalInfo.photo;
    if (!isOversizedPhoto(photo)) return undefined;

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      const maxWidth = 300;
      const maxHeight = 390;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressedPhoto = canvas.toDataURL('image/jpeg', 0.82);
      if (!cancelled) {
        setResumeData((data) => ({
          ...data,
          personalInfo: { ...data.personalInfo, photo: compressedPhoto }
        }));
      }
    };
    image.src = photo;
    return () => {
      cancelled = true;
    };
  }, [resumeData.personalInfo.photo]);

  const checkForUpdates = useCallback(async () => {
    if (!isTauriApp()) return;

    try {
      setUpdateStatus('checking');
      setAvailableUpdate(null);
      setUpdateProgress(null);
      const update = await check();
      if (update) {
        setAvailableUpdate(update);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('latest');
      }
    } catch (error) {
      console.error('检查更新失败：', error);
      setUpdateStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!isTauriApp()) return undefined;
    const timeoutId = window.setTimeout(() => {
      checkForUpdates();
    }, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [checkForUpdates]);

  const handleInstallUpdate = async () => {
    if (!availableUpdate) return;
    if (!window.confirm(`即将下载并安装 v${availableUpdate.version}。安装完成后应用会自动关闭，是否继续？`)) return;

    try {
      localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(resumeData));
      setUpdateStatus('downloading');
      let downloadedLength = 0;
      let contentLength = 0;
      await availableUpdate.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength || 0;
        }
        if (event.event === 'Progress') {
          downloadedLength += event.data.chunkLength;
          setUpdateProgress(contentLength ? Math.round((downloadedLength / contentLength) * 100) : null);
        }
      });
      setUpdateStatus('installed');
    } catch (error) {
      console.error('安装更新失败：', error);
      setUpdateStatus('error');
    }
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (isOversizedPhoto(resumeData.personalInfo.photo)) return;

    const timeoutId = window.setTimeout(() => {
      const snapshot = JSON.stringify(resumeData);
      const savedAt = new Date().toLocaleString('zh-CN', { hour12: false });
      try {
        localStorage.setItem(RESUME_STORAGE_KEY, snapshot);
        setLastSavedAt(savedAt);
        if (historyRecords[0]?.snapshot === snapshot) return;
        const nextRecords = [{ id: Date.now(), savedAt, snapshot }, ...historyRecords].slice(0, MAX_HISTORY_RECORDS);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextRecords));
        setHistoryRecords(nextRecords);
      } catch (error) {
        console.error('本地保存失败：', error);
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [historyRecords, isHydrated, resumeData]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutConfig));
    } catch (error) {
      console.error('版式保存失败：', error);
    }
  }, [isHydrated, layoutConfig]);

  // Clean up audio context on unmount
  useEffect(() => {
    return () => {
      if (noiseSource) {
        try { noiseSource.stop(); } catch {}
      }
    };
  }, [noiseSource]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Web Audio Synthesizer: play focused coding rain white noise
  const toggleBgm = () => {
    if (bgmActive) {
      if (noiseSource) {
        try {
          noiseSource.stop();
        } catch {}
      }
      setBgmActive(false);
    } else {
      try {
        const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!audioCtx) setAudioCtx(ctx);

        const sampleRate = ctx.sampleRate;
        const bufferSize = 2 * sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 650; // Cutoff at 650Hz

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.08; // Set relaxing volume

        whiteNoise.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();
        setNoiseSource(whiteNoise);
        setBgmActive(true);
      } catch (err) {
        console.error("Audio Context initialization failed:", err);
      }
    }
  };

  // Local keyword coverage checker
  const handleJdMatch = () => {
    if (!jdText.trim()) return;
    setIsMatching(true);
    setTimeout(() => {
      const resumeString = JSON.stringify(resumeData).toLowerCase();
      const jdLower = jdText.toLowerCase();
      
      const keywordGroups = [
        { name: 'Python 开发', keys: ['python', 'asyncio', 'fastapi', 'drogon', '后端', 'django', 'flask'] },
        { name: '目标检测 & YOLO', keys: ['yolo', 'opencv', '图像', '检测', '缺陷', 'cv', '视觉', 'tensorrt'] },
        { name: '大模型 & RAG', keys: ['rag', 'llm', 'agent', '大模型', '向量', 'chroma', 'bge-m3', 'react'] },
        { name: '前端 & 跨平台', keys: ['react native', 'expo', 'tauri', 'react', 'vite', '前端', 'html', 'js'] },
        { name: '工程与部署', keys: ['docker', 'sqlite', 'git', 'ci/cd', '部署', '打包'] }
      ];

      let matchedNames = [];
      let missingNames = [];

      keywordGroups.forEach(group => {
        const jdMentions = group.keys.some(k => jdLower.includes(k));
        if (jdMentions) {
          const resumeHas = group.keys.some(k => resumeString.includes(k));
          if (resumeHas) {
            matchedNames.push(group.name);
          } else {
            missingNames.push(group.name);
          }
        }
      });

      let score = 70; // Base score
      if (matchedNames.length > 0 || missingNames.length > 0) {
        score = Math.round((matchedNames.length / (matchedNames.length + missingNames.length)) * 40 + 60);
      } else {
        const fallbackWords = ['python', 'yolo', 'rag', 'react', 'fastapi', 'git', 'docker', 'sqlite'];
        let hits = 0;
        fallbackWords.forEach(w => {
          if (resumeString.includes(w) && jdLower.includes(w)) hits++;
        });
        score = 60 + hits * 5;
      }
      if (score > 100) score = 100;

      setMatchResult({
        score,
        matched: matchedNames,
        missing: missingNames
      });
      setIsMatching(false);
    }, 1000);
  };

  const _handleBgeOptimize = () => {
    if (!matchResult || matchResult.missing.length === 0) return;
    
    setIsMatching(true);
    setTimeout(() => {
      let updatedProjects = [...resumeData.projects];
      
      matchResult.missing.forEach(missingCategory => {
        if (missingCategory === '目标检测 & YOLO') {
          const pIdx = updatedProjects.findIndex(p => p.name.includes('缺陷') || p.name.includes('检测'));
          if (pIdx !== -1) {
            updatedProjects[pIdx] = {
              ...updatedProjects[pIdx],
              work: [
                `基于 **YOLOv8s** 目标检测框架，设计并训练高精度缺陷识别算法，引入自适应多尺度数据增强，缺陷识别精度 **mAP50 提升至 0.906**，大幅降低产线漏检率。`,
                ...updatedProjects[pIdx].work.slice(1)
              ],
              outcomes: [
                `模型推理延迟缩减至 **12ms**，在 NVIDIA Edge 边缘计算设备上实现 **60FPS** 高帧率实时检测与容器化微服务部署。`,
                ...updatedProjects[pIdx].outcomes.slice(1)
              ]
            };
          }
        }
        
        if (missingCategory === '大模型 & RAG') {
          const pIdx = updatedProjects.findIndex(p => p.name.includes('客服') || p.name.includes('大模型') || p.name.includes('智能'));
          if (pIdx !== -1) {
            updatedProjects[pIdx] = {
              ...updatedProjects[pIdx],
              work: [
                `基于 **ReAct** 拓扑架构自主研发 Agent 多轮对话决策系统，结合 **BGE-M3 向量表征模型**及 Chroma 检索器，完成 RAG 语义国标知识库的搭建。`,
                ...updatedProjects[pIdx].work.slice(1)
              ],
              outcomes: [
                `自主设计“双层安全规则护栏”有效解决大模型限制与幻觉问题，使得线上智能客服问答检索排序准确率提升 **25%**，问答准确率达 **99%**。`,
                ...updatedProjects[pIdx].outcomes.slice(1)
              ]
            };
          }
        }

        if (missingCategory === '前端 & 跨平台') {
          const pIdx = updatedProjects.findIndex(p => p.name.includes('Subdue') || p.name.includes('订阅') || p.name.includes('跨平台'));
          if (pIdx !== -1) {
            updatedProjects[pIdx] = {
              ...updatedProjects[pIdx],
              work: [
                `采用 **React Native** 与 **Tauri** 跨平台混合引擎开发客户端，独立实现前端多线程渲染与本地 SQLite 加密缓存，代码逻辑复用率高达 **85%**。`,
                ...updatedProjects[pIdx].work.slice(1)
              ]
            };
          }
        }
      });

      setResumeData({
        ...resumeData,
        projects: updatedProjects
      });

      setMatchResult({
        score: 100,
        matched: [...matchResult.matched, ...matchResult.missing],
        missing: []
      });
      setIsMatching(false);
      alert("本地规则已更新项目描述。");
    }, 1500);
  };

  // Trigger AI Polish suggest generation
  const handleTriggerPolish = async (rawText, callback) => {
    setPolishModal({
      isOpen: true,
      text: rawText,
      onSave: callback,
      generatedOptions: [
        "✨ AI 正在为您创作更专业的表达，请稍候...", 
        "⚡ 正在调用本地/云端小模型进行深度重写...", 
        "🤖 模型运算中..."
      ]
    });

    const systemPrompt = `你是一位顶尖的简历优化专家和技术面试官。请帮我把下面这段简历描述（项目开发工作或收获成果）润色得更专业、更技术化。
润色要求：
1. 使用专业的技术动词和架构术语。
2. 强调具体的行为、所用工具和量化成果（如 mAP、时间、吞吐率等）。
3. 保持一句话的紧凑句式，字数在50-80字左右。
4. 返回 3 种不同风格的润色选项，用 JSON 格式输出，例如：
{
  "options": [
    "选项1...",
    "选项2...",
    "选项3..."
  ]
}
不要返回任何其他解释性文字，只返回上述 JSON 字符串。
待润色的描述：
${rawText}`;

    try {
      let responseText = '';
      if (aiConfig.engine === 'ollama') {
        const res = await fetch(`${aiConfig.endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: aiConfig.model || 'qwen2.5:1.5b',
            prompt: systemPrompt,
            stream: false
          })
        });
        if (!res.ok) throw new Error(`Ollama 端口未响应或模型未启动 (${res.status})`);
        const data = await res.json();
        responseText = data.response;
      } else if (aiConfig.engine === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model || 'gemini-1.5-flash'}:generateContent?key=${aiConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }]
          })
        });
        if (!res.ok) throw new Error(`Google Gemini 接口请求失败 (${res.status})`);
        const data = await res.json();
        responseText = data.candidates[0].content.parts[0].text;
      } else if (aiConfig.engine === 'lmstudio') {
        const res = await fetch(`${aiConfig.endpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.4,
            max_tokens: 768
          })
        });
        if (!res.ok) throw new Error(`LM Studio 请求失败 (${res.status})`);
        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || '';
      } else if (aiConfig.engine === 'openai') {
        const res = await fetch(`${aiConfig.endpoint}/chat/completions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.apiKey}`
          },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [
              { role: 'system', content: 'You are a helpful resume polish assistant.' },
              { role: 'user', content: systemPrompt }
            ]
          })
        });
        if (!res.ok) throw new Error(`云端 OpenAI 兼容接口连接失败 (${res.status})`);
        const data = await res.json();
        responseText = data.choices[0].message.content;
      }

      const parsed = parseLLMResponse(responseText);
      if (parsed && parsed.length > 0) {
        setPolishModal(prev => ({ ...prev, generatedOptions: parsed }));
      } else {
        throw new Error("解析润色文本格式失败，模型返回值不满足规范");
      }
    } catch (err) {
      console.error("Local/Cloud model generation error", err);
      setPolishModal(prev => ({ 
        ...prev, 
        generatedOptions: [
          `⚠️ AI 润色未完成：${err.message}`,
          '请确认 LM Studio 已启动 Local Server，并且已加载对话模型后重试。'
        ]
      }));
    }
  };

  // Section position swapper
  const handleSectionOrderMove = (id, direction) => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    
    const newSections = [...sections];
    const temp = newSections[idx];
    newSections[idx] = newSections[targetIdx];
    newSections[targetIdx] = temp;
    
    const updated = newSections.map((sec, i) => ({
      ...sec,
      order: i
    }));
    setSections(updated);
  };

  // Section column swapper (Left / Right Column in Double Layout)
  const handleSectionColToggle = (id) => {
    const updated = sections.map(sec => {
      if (sec.id === id) {
        return {
          ...sec,
          col: sec.col === 'left' ? 'right' : 'left'
        };
      }
      return sec;
    });
    setSections(updated);
  };

  // Import JSON / Markdown from file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (!parsed.personalInfo || !parsed.education || !parsed.skills || !parsed.projects) {
            throw new Error("JSON 格式不符合简历规范（缺少必要字段）");
          }
          setResumeData(normalizeResumeData(parsed));
          alert("JSON 简历导入成功！");
        } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          const parsed = markdownToJson(text);
          setResumeData(normalizeResumeData(parsed));
          alert("Markdown 简历导入与格式转换成功！");
        } else {
          alert("不支持的文件格式，请上传 .json 或 .md 文件");
        }
      } catch (err) {
        alert("导入失败: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreRecord = (record) => {
    if (!window.confirm(`确定恢复到 ${record.savedAt} 的版本吗？`)) return;
    try {
      setResumeData(normalizeResumeData(JSON.parse(record.snapshot)));
      setShowHistory(false);
    } catch {
      alert('该修改记录已损坏，无法恢复。');
    }
  };

  // Export current data as JSON file
  const handleExportJSON = async () => {
    const filename = `${resumeData.personalInfo.name}_简历_${new Date().toISOString().split('T')[0]}.json`;
    const content = JSON.stringify(resumeData, null, 2);
    if (await saveExportFile(filename, 'json', content)) return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename, true);
  };

  ;

  ;

  // Export current data as Markdown file
  const handleExportMarkdown = async () => {
    const mdText = jsonToMarkdown(resumeData);
    const filename = `${resumeData.personalInfo.name}_简历_${new Date().toISOString().split('T')[0]}.md`;
    if (await saveExportFile(filename, 'md', mdText)) return;
    const blob = new Blob([mdText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename, true);
  };

  ;

  ;

  // Compile fully self-contained HTML for download
  const handleExportHTML = async () => {
    const { personalInfo, education, skills, projects, honors = [], certificates = [], hobbies = [], selfEvaluation } = resumeData;
    const config = layoutConfig;
    const hasPhoto = config.showPhoto && personalInfo.photo;
    const isDouble = config.layoutStyle === 'double';
    const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
    const visibleCourses = (education.courses || []).filter(hasText);
    const hasEducation = [education.school, education.major, education.degree, education.startDate, education.endDate, education.status].some(hasText)
      || visibleCourses.length > 0;
    const visibleSkills = skills
      .map((skill, index) => ({ skill, index }))
      .filter(({ skill }) => hasText(skill.category) || (skill.items || []).some(hasText));
    const visibleProjects = projects
      .map((project, index) => ({ project, index }))
      .filter(({ project }) => project.enabled !== false && (
        [project.name, project.role, project.type, project.repo].some(hasText)
        || (project.work || []).some(hasText)
        || (project.outcomes || []).some(hasText)
      ));
    const visibleHonors = honors.map((honor, index) => ({ honor, index })).filter(({ honor }) => hasText(honor));
    const visibleCertificates = certificates.map((certificate, index) => ({ certificate, index })).filter(({ certificate }) => hasText(certificate));
    const visibleHobbies = hobbies.map((hobby, index) => ({ hobby, index })).filter(({ hobby }) => hasText(hobby));
    const visibleEvaluations = selfEvaluation.map((line, index) => ({ line, index })).filter(({ line }) => hasText(line));

    const escapeHTML = (text) => {
      if (!text) return "";
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    const parseMD = (text) => {
      if (!text) return "";
      return escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
    };

    const fieldStyleHTML = (path) => {
      const style = config.fieldStyles?.[path] || {};
      const parts = [];
      if (['Microsoft YaHei', 'DengXian', 'SimSun'].includes(style.fontFamily)) parts.push(`font-family:${getResumeFontStack(style.fontFamily)}`);
      if (/^([89]|[12][0-9]|3[0-2])(\.\d+)?pt$/.test(style.fontSize || '')) parts.push(`font-size:${style.fontSize}`);
      if (style.fontWeight === '700') parts.push('font-weight:700');
      if (/^#[0-9a-fA-F]{6}$/.test(style.color || '')) parts.push(`color:${style.color}`);
      if (['left', 'center'].includes(style.textAlign)) parts.push(`text-align:${style.textAlign};display:inline-block;width:100%`);
      return parts.join(';');
    };

    const fieldHTML = (path, content) => `<span style="${fieldStyleHTML(path)}">${content}</span>`;

    // Helper to render customized section titles for HTML export
    const renderTitleHTML = (title) => {
      const style = config.titleStyle || 'leftbar';
      if (style === 'leftbar') {
        return `<h3 class="section-title" style="border-bottom: 1.5px solid var(--resume-divider); padding-bottom: 4px; position: relative; padding-left: 10px;">
          <span style="position: absolute; left: 0; top: 15%; bottom: 15%; width: 3.5px; background: var(--resume-accent); border-radius: 2px;"></span>
          ${title}
        </h3>`;
      }
      if (style === 'bottomline') {
        return `<h3 class="section-title" style="border-bottom: 2.5px solid var(--resume-accent); padding-bottom: 5px;">
          ${title}
        </h3>`;
      }
      if (style === 'borderwrap') {
        return `<h3 class="section-title" style="background: rgba(30, 58, 138, 0.06); border: 1px solid var(--resume-accent); border-radius: 4px; padding: 6px 12px; font-size: 14px;">
          ${title}
        </h3>`;
      }
      return `<h3 class="section-title" style="border-bottom: none; padding-left: 0; font-weight: 700;">
        ${title}
      </h3>`;
    };

    const coursesHTML = visibleCourses.map(c => escapeHTML(c)).join('、');
    
    const skillsHTML = visibleSkills.map(({ skill, index }) => `
      <div class="skill-cat">
        <span class="skill-cat-title">${fieldHTML(`skills.${index}.category`, escapeHTML(skill.category))}</span>：
        <span>${(skill.items || []).map((item, itemIndex) => hasText(item) ? fieldHTML(`skills.${index}.items.${itemIndex}`, parseMD(item)) : '').filter(Boolean).join('；')}</span>
      </div>
    `).join('');

    const skillsVerticalHTML = visibleSkills.map(({ skill, index }) => `
      <div class="skill-cat" style="display: block; margin-bottom: 6px;">
        <div style="font-weight: bold; color: ${config.textColor}; margin-bottom: 2px;">${fieldHTML(`skills.${index}.category`, escapeHTML(skill.category))}</div>
        <div style="color: #4b5563; line-height: ${config.lineHeight};">
          ${(skill.items || []).map((item, itemIndex) => hasText(item) ? `<div style="margin-bottom: 2px;">• ${fieldHTML(`skills.${index}.items.${itemIndex}`, parseMD(item))}</div>` : '').join('')}
        </div>
      </div>
    `).join('');

    const projectsHTML = visibleProjects.map(({ project: proj, index }) => `
      <div class="project-item" style="margin-bottom: ${config.itemMargin}px;">
        <div class="project-header">
          <div class="project-name-role">
            <span class="project-name">${fieldHTML(`projects.${index}.name`, escapeHTML(proj.name))}</span>
            <span class="project-tag" style="border-radius: ${config.borderRadius}px;">${fieldHTML(`projects.${index}.type`, escapeHTML(proj.type))}</span>
            <span class="project-role" style="font-size: 12px; color: #6b7280; font-weight: normal;">(${fieldHTML(`projects.${index}.role`, escapeHTML(proj.role))})</span>
          </div>
          <div class="project-time">${fieldHTML(`projects.${index}.startDate`, escapeHTML(proj.startDate))} – ${fieldHTML(`projects.${index}.endDate`, escapeHTML(proj.endDate))}</div>
        </div>
        ${proj.repo ? `<div class="project-repo">开源仓库：<a href="${proj.repo.startsWith('http') ? proj.repo : 'https://' + proj.repo}" target="_blank">${escapeHTML(proj.repo)}</a></div>` : ''}
        ${proj.work && proj.work.length > 0 ? `
          <ul class="bullet-list">
            ${proj.work.map((w, workIndex) => `<li>${fieldHTML(`projects.${index}.work.${workIndex}`, parseMD(w))}</li>`).join('')}
          </ul>
        ` : ''}
        ${proj.outcomes && proj.outcomes.length > 0 ? `
          <ul class="bullet-list outcomes" style="margin-top: 4px;">
            ${proj.outcomes.map((o, outcomeIndex) => `<li>${fieldHTML(`projects.${index}.outcomes.${outcomeIndex}`, parseMD(o))}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('');

    const honorsHTML = visibleHonors.length > 0 ? `
      <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
        ${renderTitleHTML('🏆 荣誉奖项')}
        <div class="honors-list">
          ${visibleHonors.map(({ honor, index }) => `
            <div class="honor-item">
              <span>🏆</span>
              ${fieldHTML(`honors.${index}`, parseMD(honor))}
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const certificatesHTML = visibleCertificates.length > 0 ? `
      <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
        ${renderTitleHTML('🎖️ 技能证书')}
        <div class="honors-list">
          ${visibleCertificates.map(({ certificate, index }) => `
            <div class="honor-item">
              <span>🎖️</span>
              ${fieldHTML(`certificates.${index}`, parseMD(certificate))}
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const hobbiesHTML = visibleHobbies.length > 0 ? `
      <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
        ${renderTitleHTML('🌿 兴趣爱好')}
        <div class="honors-list">
          ${visibleHobbies.map(({ hobby, index }) => `
            <div class="honor-item">
              <span>🌿</span>
              ${fieldHTML(`hobbies.${index}`, parseMD(hobby))}
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const selfEvalHTML = visibleEvaluations.length > 0 ? `
      <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
        ${renderTitleHTML('💡 自我评价')}
        <ul class="eval-list">
          ${visibleEvaluations.map(({ line, index }) => `
            <li>
              <span class="bullet-dot">•</span>
              ${fieldHTML(`selfEvaluation.${index}`, parseMD(line))}
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    const renderSectionHTML = (id) => {
      switch (id) {
        case 'education':
          return hasEducation ? `
            <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
              ${renderTitleHTML('🎓 教育背景')}
              <div style="font-weight: bold; font-size: 13.5px;">${fieldHTML('education.school', escapeHTML(education.school))}</div>
              <div style="font-size: 12.5px; color: #4b5563;">${fieldHTML('education.major', escapeHTML(education.major))}</div>
              <div style="font-size: 12.5px; color: #4b5563;">${fieldHTML('education.degree', escapeHTML(education.degree))}${hasText(education.degree) && hasText(education.status) ? ' · ' : ''}${hasText(education.status) ? fieldHTML('education.status', escapeHTML(education.status)) : ''}</div>
              <div style="font-size: 11.5px; color: #4b5563; margin-bottom: 6px;">${fieldHTML('education.startDate', escapeHTML(education.startDate))} – ${fieldHTML('education.endDate', escapeHTML(education.endDate))}</div>
              <div style="font-size: 11.5px; color: #4b5563; line-height: 1.4;">
                <strong>主修课程</strong>：${fieldHTML('education.courses', coursesHTML)}
              </div>
            </div>` : '';
        case 'skills':
          return visibleSkills.length > 0 ? (isDouble ? `
            <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
              ${renderTitleHTML('▍ 专业技能')}
              <div class="skills-list" style="font-size: 12px; gap: 8px;">
                ${skillsVerticalHTML}
              </div>
            </div>` : `
            <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
              ${renderTitleHTML('▍ 专业技能')}
              <div class="skills-list">
                ${skillsHTML}
              </div>
            </div>`) : '';
        case 'projects':
          return visibleProjects.length > 0 ? `
            <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
              ${renderTitleHTML('🚀 开源项目与实践经历')}
              ${projectsHTML}
            </div>` : '';
        case 'honors':
          return honorsHTML;
        case 'certificates':
          return certificatesHTML;
        case 'hobbies':
          return hobbiesHTML;
        case 'selfEvaluation':
          return selfEvalHTML;
        default:
          return '';
      }
    };

    const leftSectionsHTML = [...sections]
      .filter(s => s.col === 'left')
      .sort((a, b) => a.order - b.order)
      .map(s => renderSectionHTML(s.id))
      .join('');

    const rightSectionsHTML = [...sections]
      .filter(s => s.col === 'right')
      .sort((a, b) => a.order - b.order)
      .map(s => renderSectionHTML(s.id))
      .join('');

    const allSectionsSingleHTML = [...sections]
      .sort((a, b) => a.order - b.order)
      .map(s => renderSectionHTML(s.id))
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(personalInfo.name)} - 个人简历</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: ${getResumeFontStack(config.fontFamily)};
      background-color: ${config.bgColor};
      color: ${config.textColor};
      line-height: ${config.lineHeight};
      padding: ${config.padding}mm ${config.layoutStyle === 'double' ? config.doubleRightPadding : config.padding}mm ${config.padding}mm ${config.layoutStyle === 'double' ? config.doubleLeftPadding : config.padding}mm;
      font-size: ${config.bodyFontSize ?? 10.5}pt;
      --resume-accent: ${config.accentColor};
      --resume-divider: ${config.dividerColor};
      --resume-border: #e5e7eb;
    }
    a {
      color: var(--resume-accent);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-bottom: 16px;
    }
    .header-info {
      flex: 1;
      text-align: left;
    }
    .header-photo {
      width: 80px;
      height: 105px;
      border: 1px solid var(--resume-border);
      border-radius: ${config.borderRadius}px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9fafb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      flex-shrink: 0;
    }
    .header-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .name {
      font-size: ${config.nameFontSize ?? 22}pt;
      font-weight: 700;
      color: var(--resume-accent);
      margin-bottom: 6px;
      letter-spacing: 0.05em;
    }
    .intent {
      font-size: 13.5px;
      font-weight: 600;
      color: ${config.textColor};
      margin-bottom: 8px;
    }
    .contact {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12.5px;
      color: #4b5563;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .section {
      margin-bottom: ${config.sectionMargin}px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: ${config.titleFontSize ?? 12.5}pt;
      font-weight: 700;
      color: var(--resume-accent);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      position: relative;
    }
    .edu-item {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      margin-bottom: 2px;
      font-size: ${config.bodyFontSize ?? 10.5}pt;
    }
    .edu-courses {
      font-size: ${config.bodyFontSize ?? 10.5}pt;
      color: #4b5563;
      margin-bottom: 8px;
    }
    .skills-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: ${config.bodyFontSize ?? 10.5}pt;
    }
    .skill-cat {
      margin-bottom: 2px;
    }
    .skill-cat-title {
      font-weight: 600;
      color: ${config.textColor};
      display: inline-block;
      min-width: 130px;
    }
    .project-item {
      margin-bottom: ${config.itemMargin}px;
      page-break-inside: avoid;
    }
    
    /* Timeline style */
    ${config.timeline ? `
    .project-item {
      position: relative;
      padding-left: 16px;
    }
    .project-item::before {
      content: "";
      position: absolute;
      left: 0;
      top: 6px;
      bottom: -12px;
      width: 1.5px;
      background: var(--resume-border);
    }
    .project-item:last-child::before {
      bottom: 0;
      height: 6px;
    }
    .project-item::after {
      content: "";
      position: absolute;
      left: -3px;
      top: 7px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--resume-accent);
      border: 1px solid #ffffff;
    }
    ` : ''}

    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-weight: 600;
      margin-bottom: 4px;
      font-size: ${config.bodyFontSize ?? 10.5}pt;
    }
    .project-name-role {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .project-name {
      font-size: ${config.bodyFontSize ?? 10.5}pt;
      font-weight: bold;
    }
    .project-tag {
      font-size: 10px;
      background: var(--resume-accent);
      color: white;
      padding: 0px 5px;
      border-radius: ${config.borderRadius}px;
      font-weight: normal;
      line-height: 1.4;
    }
    .project-role {
      font-size: 12px;
      color: #6b7280;
      font-weight: normal;
    }
    .project-time {
      font-size: 12px;
      color: #4b5563;
    }
    .project-repo {
      font-size: 12px;
      color: var(--resume-accent);
      margin-bottom: 4px;
      font-family: monospace;
    }
    .bullet-list {
      list-style-type: none;
      padding-left: 0;
      font-size: ${config.bodyFontSize ?? 10.5}pt;
    }
    .bullet-list li {
      position: relative;
      padding-left: 12px;
      margin-bottom: 2px;
      color: ${config.textColor};
    }
    .bullet-list li::before {
      content: "•";
      position: absolute;
      left: 2px;
      color: var(--resume-accent);
    }
    .bullet-list li strong {
      color: #000;
    }
    .bullet-list.outcomes li {
      color: #4b5563;
    }
    .bullet-list.outcomes li::before {
      content: "✓";
      color: #10b981;
    }
    .honors-list {
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .honor-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .eval-list {
      font-size: 13px;
      list-style: none;
    }
    .eval-list li {
      position: relative;
      padding-left: 12px;
      margin-bottom: 4px;
      line-height: 1.5;
    }
    .bullet-dot {
      position: absolute;
      left: 0;
      color: var(--resume-accent);
    }

    /* Layout Double column styles */
    .layout-double {
      display: grid;
      grid-template-columns: ${config.leftColumnRatio ?? 31}% 1fr;
      gap: 20px;
    }
    .layout-double .left-col {
      border-right: 1px solid var(--resume-border);
      padding-right: 16px;
    }
    .layout-double .right-col {
      padding-left: 4px;
    }
    .vertical-contact {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
      color: #4b5563;
    }
    .vertical-contact-item {
      display: flex;
      align-items: center;
      gap: 6px;
      word-break: break-all;
      line-height: 1.4;
    }

    @media print {
      body {
        padding: 10mm;
      }
      .section, .project-item {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${isDouble ? `
    <!-- Two Column Layout -->
    <div class="layout-double">
      <!-- Left sidebar narrow column -->
      <div class="left-col">
        ${hasPhoto ? `
          <div style="margin-bottom: 16px; text-align: center;">
            <img src="${personalInfo.photo}" alt="证件照" style="width: 100px; height: 130px; object-fit: cover; border-radius: ${config.borderRadius}px; border: 1px solid var(--resume-border);" />
          </div>
        ` : ''}
        
        <!-- Contact -->
        <div class="section" style="margin-bottom: ${config.sectionMargin}px;">
          ${renderTitleHTML('👤 基本信息')}
          <div class="vertical-contact">
            <div class="vertical-contact-item"><span>📞</span> ${fieldHTML('personalInfo.phone', escapeHTML(personalInfo.phone))}</div>
            <div class="vertical-contact-item"><span>✉️</span> ${fieldHTML('personalInfo.email', escapeHTML(personalInfo.email))}</div>
            <div class="vertical-contact-item" style="font-size: 11px;"><span>🔗</span> ${fieldHTML('personalInfo.github', escapeHTML(personalInfo.github))}</div>
            ${personalInfo.city ? `<div class="vertical-contact-item"><span>📍</span> ${fieldHTML('personalInfo.city', escapeHTML(personalInfo.city))}</div>` : ''}
            ${personalInfo.birthDate ? `<div class="vertical-contact-item"><span>🎂</span> ${fieldHTML('personalInfo.birthDate', escapeHTML(personalInfo.birthDate))}</div>` : ''}
          </div>
        </div>

        <!-- Left Column Modular Sections -->
        ${leftSectionsHTML}
      </div>

      <!-- Right wide column -->
      <div class="right-col">
        <!-- Header -->
        <div style="border-bottom: 2px solid var(--resume-accent); padding-bottom: 10px; margin-bottom: 16px;">
          <h1 class="name" style="font-size: 28px; margin-bottom: 4px;">${fieldHTML('personalInfo.name', escapeHTML(personalInfo.name))}</h1>
          <div class="intent" style="color: var(--resume-accent); font-size: 14.5px; font-weight: bold;">求职意向：${fieldHTML('personalInfo.intent', escapeHTML(personalInfo.intent))}</div>
        </div>

        <!-- Right Column Modular Sections -->
        ${rightSectionsHTML}
      </div>
    </div>
  ` : `
    <!-- Classic Single Column Layout -->
    <!-- Header -->
    <div class="header">
      <h1 class="name">${fieldHTML('personalInfo.name', escapeHTML(personalInfo.name))}</h1>
      <div class="intent">求职意向：${fieldHTML('personalInfo.intent', escapeHTML(personalInfo.intent))}</div>
      <div class="contact">
        <div class="contact-item"><span>📞</span> ${fieldHTML('personalInfo.phone', escapeHTML(personalInfo.phone))}</div>
        <div class="contact-item"><span>✉️</span> ${fieldHTML('personalInfo.email', escapeHTML(personalInfo.email))}</div>
        <div class="contact-item"><span>🔗</span> ${fieldHTML('personalInfo.github', escapeHTML(personalInfo.github))}</div>
        ${personalInfo.city ? `<div class="contact-item"><span>📍</span> ${fieldHTML('personalInfo.city', escapeHTML(personalInfo.city))}</div>` : ''}
        ${personalInfo.birthDate ? `<div class="contact-item"><span>🎂</span> ${fieldHTML('personalInfo.birthDate', escapeHTML(personalInfo.birthDate))}</div>` : ''}
      </div>
    </div>

    <!-- All Modular Sections Vertically -->
    ${allSectionsSingleHTML}
  `}
</body>
</html>`;

    const filename = `${personalInfo.name}_网页简历.html`;
    if (await saveExportFile(filename, 'html', htmlContent)) return;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename, true);
  }

  // Export entire resume to high-definition PNG using an off-screen cloned node (immune to scrolling/viewport squeeze)
  const handleExportPNG = async () => {
    const element = document.getElementById('resume-print-area');
    if (!element) return;
    
    // Create an off-screen clone for perfect independent A4 dimensions rendering
    const clone = element.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = '210mm';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    document.body.appendChild(clone);
    
    // Give browser layout engine a small tick to repaint the cloned DOM nodes
    await new Promise(r => setTimeout(r, 250));
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(clone, {
        scale: 3, // 3x scale for crisp HD texts
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const url = canvas.toDataURL('image/png');
      const blob = await (await fetch(url)).blob();
      const filename = `${resumeData.personalInfo.name}_简历_高清长图.png`;
      if (!(await saveExportFile(filename, 'png', new Uint8Array(await blob.arrayBuffer())))) {
        triggerDownload(url, filename);
      }
    } catch (err) {
      console.error("PNG generation failed:", err);
      alert("导出图片失败: " + err.message);
    } finally {
      clone.remove();
    }
  };

  // Slice the canvas and export page-by-page A4 PNGs
  const handleExportPagesPNG = async () => {
    const element = document.getElementById('resume-print-area');
    if (!element) return;
    
    const clone = element.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = '210mm';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    document.body.appendChild(clone);
    
    // Give browser layout engine a small tick to repaint the cloned DOM nodes
    await new Promise(r => setTimeout(r, 250));
    
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(clone, {
        scale: 3, // Ultra-sharp 3x DPI
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const pageHeightPx = (canvas.width * 297) / 210;
      let topOffset = 0;
      let pageNum = 1;
      
      while (topOffset < canvas.height) {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pageHeightPx, canvas.height - topOffset);
        
        const ctx = pageCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, topOffset, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
        
        const url = pageCanvas.toDataURL('image/png');
        const blob = await (await fetch(url)).blob();
        const filename = `${resumeData.personalInfo.name}_简历_第${pageNum}页.png`;
        if (!(await saveExportFile(filename, 'png', new Uint8Array(await blob.arrayBuffer())))) {
          triggerDownload(url, filename);
        }
        
        topOffset += pageHeightPx;
        pageNum++;
        // Small stagger to prevent browser batch download blocks
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err) {
      console.error("Pages PNG generation failed:", err);
      alert("导出分页图片失败: " + err.message);
    } finally {
      clone.remove();
    }
  };

  // Export entire resume to high-definition PNG using an off-screen cloned node (immune to scrolling/viewport squeeze)
  ;

  // Convert resume elements to Canvas via off-screen node, then split pages cleanly to PDF
  const handleExportCanvasPDF = async () => {
    const element = document.getElementById('resume-print-area');
    if (!element) return;
    
    const clone = element.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = '210mm';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    document.body.appendChild(clone);
    
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const canvas = await html2canvas(clone, {
        scale: 2, // 2x scale is optimal for A4 sizes
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      
      // Render first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
      
      // Render remaining page slices
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
      
      const filename = `${resumeData.personalInfo.name}_简历_高清PDF.pdf`;
      const pdfBytes = new Uint8Array(pdf.output('arraybuffer'));
      if (!(await saveExportFile(filename, 'pdf', pdfBytes))) pdf.save(filename);
    } catch (err) {
      console.error("Canvas PDF generation failed:", err);
      alert("导出 PDF 失败: " + err.message);
    } finally {
      clone.remove();
    }
  }

  // Export entire resume scaled to fit exactly ONE single A4 page
  const handleExportSinglePagePDF = async () => {
    const element = document.getElementById('resume-print-area');
    if (!element) return;
    
    const clone = element.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = '210mm';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    document.body.appendChild(clone);
    
    // Give browser layout engine a small tick to repaint the cloned DOM nodes
    await new Promise(r => setTimeout(r, 250));
    
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      const canvas = await html2canvas(clone, {
        scale: 2.5, // 2.5x scale
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdfWidth = 210; // A4 dimensions in mm
      const pdfHeight = 297;
      
      const canvasAspect = canvas.width / canvas.height;
      const pdfAspect = pdfWidth / pdfHeight;
      
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;
      let xOffset = 0;
      let yOffset = 0;
      
      if (canvasAspect > pdfAspect) {
        // Canvas is wider than standard A4 ratio
        finalWidth = pdfWidth;
        finalHeight = pdfWidth / canvasAspect;
        yOffset = (pdfHeight - finalHeight) / 2;
      } else {
        // Canvas is taller than standard A4 ratio (common case for long resumes)
        // Shrink the long resume proportionally to fit exactly within one 297mm height sheet
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * canvasAspect;
        xOffset = (pdfWidth - finalWidth) / 2;
      }
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');
      const filename = `${resumeData.personalInfo.name}_简历_单页自适应.pdf`;
      const pdfBytes = new Uint8Array(pdf.output('arraybuffer'));
      if (!(await saveExportFile(filename, 'pdf', pdfBytes))) pdf.save(filename);
    } catch (err) {
      console.error("Single page PDF export failed:", err);
      alert("导出单页 PDF 失败: " + err.message);
    } finally {
      clone.remove();
    }
  };

  ;

  ;;

  ;

  ;

  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="logo">
          <div className="logo-icon">📄</div>
          <span>CV Craft &amp; Convert</span>
        </div>
        
        {/* Immersive Sound & Normal Actions */}
        <div className="navbar-actions">
          {/* Synthesized coding rain sound toggle button */}
          <button
            className={`btn ${bgmActive ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={toggleBgm}
            title="沉浸式白噪音 (HTML5 实时合成雨声)"
            style={{ fontWeight: '500' }}
          >
            {bgmActive ? '🎵 开启雨声' : '🎵 沉浸雨声'}
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--panel-border)', margin: '0 4px' }} />

          <label className="btn btn-secondary btn-sm" style={{ margin: 0, display: 'inline-flex', cursor: 'pointer' }}>
            📥 导入数据
            <input
              type="file"
              accept=".json,.md,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>

          <div className="export-dropdown-container" style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowHistory(!showHistory)}
              title={lastSavedAt ? `最近自动保存：${lastSavedAt}` : '本地自动保存修改记录'}
            >
              🕘 修改记录
            </button>
            {showHistory && (
              <div className="export-dropdown-menu" style={{ minWidth: '260px', maxHeight: '300px', overflowY: 'auto' }}>
                {historyRecords.length === 0 ? (
                  <div className="dropdown-item" style={{ cursor: 'default' }}>暂无修改记录</div>
                ) : historyRecords.map((record) => (
                  <button
                    key={record.id}
                    className="dropdown-item"
                    onClick={() => handleRestoreRecord(record)}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}
                  >
                    <span>恢复此版本</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{record.savedAt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={updateStatus === 'available' ? handleInstallUpdate : checkForUpdates}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            title={
              updateStatus === 'available'
                ? `发现 v${availableUpdate?.version}，点击下载并安装`
                : updateStatus === 'latest'
                  ? '当前已是最新版本，点击再次检查'
                  : updateStatus === 'error'
                    ? '更新检查失败，点击重试'
                    : '检查应用更新'
            }
          >
            {updateStatus === 'checking' && '⏳ 检查中'}
            {updateStatus === 'available' && `🆕 更新至 v${availableUpdate?.version}`}
            {updateStatus === 'downloading' && `⬇️ 下载中${updateProgress === null ? '' : ` ${updateProgress}%`}`}
            {updateStatus === 'installed' && '✓ 即将安装'}
            {updateStatus === 'latest' && '✓ 已是最新版'}
            {(updateStatus === 'idle' || updateStatus === 'error') && (updateStatus === 'error' ? '⚠️ 重试更新' : '⬆️ 检查更新')}
          </button>

          {/* Unified Export Dropdown Menu */}
          <div className="export-dropdown-container" style={{ position: 'relative' }}>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
            >
              💾 导出简历 ▾
            </button>
            {exportDropdownOpen && (
              <div className="export-dropdown-menu">
                <button className="dropdown-item" onClick={() => { handleExportSinglePagePDF(); setExportDropdownOpen(false); }}>
                  🖨️ 导出 PDF (单页自适应)
                </button>
                <button className="dropdown-item" onClick={() => { handleExportCanvasPDF(); setExportDropdownOpen(false); }}>
                  📑 导出 PDF (多页分页版)
                </button>
                <div style={{ height: '1px', background: 'var(--panel-border)', margin: '4px 0' }} />
                <button className="dropdown-item" onClick={() => { handleExportPNG(); setExportDropdownOpen(false); }}>
                  🖼️ 导出高清长图 (PNG)
                </button>
                <button className="dropdown-item" onClick={() => { handleExportPagesPNG(); setExportDropdownOpen(false); }}>
                  📑 导出分页图片 (PNG)
                </button>
                <div style={{ height: '1px', background: 'var(--panel-border)', margin: '4px 0' }} />
                <button className="dropdown-item" onClick={() => { handleExportHTML(); setExportDropdownOpen(false); }}>
                  🌐 导出单页 HTML
                </button>
                <button className="dropdown-item" onClick={() => { handleExportJSON(); setExportDropdownOpen(false); }}>
                  📥 导出 JSON 数据
                </button>
                <button className="dropdown-item" onClick={() => { handleExportMarkdown(); setExportDropdownOpen(false); }}>
                  📝 导出 Markdown 源码
                </button>
                <div style={{ height: '1px', background: 'var(--panel-border)', margin: '4px 0' }} />
                <button className="dropdown-item" onClick={() => { handlePrint(); setExportDropdownOpen(false); }}>
                  📄 浏览器打印预览
                </button>
              </div>
            )}
          </div>
          
          <button 
            className="btn btn-secondary btn-icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="切换主题"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="workspace">
        {/* Editor Sidebar */}
        <section className="editor-panel">
          
          {/* Collapsible Style Designer Panel */}
          <div style={{ borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.04)' }}>
            <button 
              onClick={() => setShowStyleDesigner(!showStyleDesigner)}
              className="btn btn-secondary btn-sm"
              style={{
                width: '100%',
                borderRadius: 0,
                border: 'none',
                padding: '12px 24px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: showStyleDesigner ? '#10b981' : 'var(--text-primary)',
                background: showStyleDesigner ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                🎨 简历版面设计与视觉调优 (自定义配色/间距)
              </span>
              <span>{showStyleDesigner ? '▼ 收起面板' : '▶ 展开面板'}</span>
            </button>
            
            {showStyleDesigner && (
              <div style={{ borderTop: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
                          <div style={{ padding: '16px 24px 8px 24px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.08)' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>🎨 基础排版配置</label>
            <div className="template-picker" aria-label="简历模板">
              {RESUME_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`template-card ${layoutConfig.templateId === template.id ? 'is-active' : ''}`}
                  onClick={() => setLayoutConfig({ ...layoutConfig, ...template.config, templateId: template.id })}
                >
                  <span className="template-card-preview" style={{ '--template-accent': template.accent }}>
                    <span />
                    <i />
                    <i />
                  </span>
                  <span>
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                  </span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              
              {/* Preset palettes */}
              <div style={{ display: 'flex', gap: '6px' }} title="选择预设配色方案">
                <button 
                  className="btn-icon" 
                  style={{ width: '22px', height: '22px', background: '#1e3a8a', border: layoutConfig.accentColor === '#1e3a8a' ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', borderRadius: '4px' }}
                  onClick={() => setLayoutConfig({ ...layoutConfig, accentColor: '#1e3a8a', dividerColor: '#3b82f6', bgColor: '#ffffff', textColor: '#1f2937' })}
                  title="经典极客蓝"
                />
                <button 
                  className="btn-icon" 
                  style={{ width: '22px', height: '22px', background: '#0f766e', border: layoutConfig.accentColor === '#0f766e' ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', borderRadius: '4px' }}
                  onClick={() => setLayoutConfig({ ...layoutConfig, accentColor: '#0f766e', dividerColor: '#14b8a6', bgColor: '#ffffff', textColor: '#1f2937' })}
                  title="翡翠山野绿"
                />
                <button 
                  className="btn-icon" 
                  style={{ width: '22px', height: '22px', background: '#374151', border: layoutConfig.accentColor === '#374151' ? '2px solid white' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', borderRadius: '4px' }}
                  onClick={() => setLayoutConfig({ ...layoutConfig, accentColor: '#374151', dividerColor: '#6b7280', bgColor: '#ffffff', textColor: '#1f2937' })}
                  title="碳黑极简风"
                />
              </div>

              <div style={{ width: '1px', height: '16px', background: 'var(--panel-border)' }} />

              {/* Layout Mode (Single vs Double Column) */}
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '3px 8px', fontSize: '11px', height: '24px', whiteSpace: 'nowrap' }}
                onClick={() => setLayoutConfig({ ...layoutConfig, layoutStyle: layoutConfig.layoutStyle === 'double' ? 'single' : 'double' })}
              >
                {layoutConfig.layoutStyle === 'double' ? '🗂️ 切换单栏' : '🗂️ 切换双栏'}
              </button>

              {/* Timeline Toggle */}
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '3px 8px', fontSize: '11px', height: '24px', whiteSpace: 'nowrap' }}
                onClick={() => setLayoutConfig({ ...layoutConfig, timeline: !layoutConfig.timeline })}
              >
                {layoutConfig.timeline ? '📅 隐藏时间轴' : '📅 显示时间轴'}
              </button>

              {/* Photo Toggle */}
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '3px 8px', fontSize: '11px', height: '24px', whiteSpace: 'nowrap' }}
                onClick={() => setLayoutConfig({ ...layoutConfig, showPhoto: !layoutConfig.showPhoto })}
              >
                {layoutConfig.showPhoto ? '🖼️ 隐藏照片' : '🖼️ 显示照片'}
              </button>

              {/* Page break Guidelines Toggle */}
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '3px 8px', fontSize: '11px', height: '24px', whiteSpace: 'nowrap' }}
                onClick={() => setLayoutConfig({ ...layoutConfig, showGuidelines: !layoutConfig.showGuidelines })}
              >
                {layoutConfig.showGuidelines ? '📏 隐藏分页线' : '📏 显示分页线'}
              </button>
              <select
                value={layoutConfig.density || 'comfortable'}
                onChange={(event) => setLayoutConfig({ ...layoutConfig, density: event.target.value })}
                aria-label="A4 排版模式"
                style={{ height: '24px', padding: '2px 6px', background: 'var(--input-bg)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px' }}
              >
                <option value="comfortable">标准排版</option>
                <option value="compact">紧凑排版</option>
                <option value="onepage">单页优先</option>
              </select>
            </div>

            {/* 2. Visual Layout Customizer (Sliders and Color Pickers) - Dimensional Blow */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', display: 'block', marginBottom: '8px' }}>🎨 视觉版面设计调优（降维打击）</span>
              
              {/* Color Pickers Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="color" 
                    value={layoutConfig.accentColor} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, accentColor: e.target.value })}
                    style={{ width: '24px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>主题主色</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="color" 
                    value={layoutConfig.dividerColor} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, dividerColor: e.target.value })}
                    style={{ width: '24px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>分割线色</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="color" 
                    value={layoutConfig.bgColor} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bgColor: e.target.value })}
                    style={{ width: '24px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>纸张底色</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="color" 
                    value={layoutConfig.textColor} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, textColor: e.target.value })}
                    style={{ width: '24px', height: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                  />
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>文字主色</label>
                </div>
              </div>

              {/* Sliders Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>正文字号</span>
                    <span>{layoutConfig.bodyFontSize ?? 10.5}pt</span>
                  </div>
                  <input
                    type="number" min="9.5" max="13" step="0.5" value={layoutConfig.bodyFontSize ?? 10.5}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, bodyFontSize: Math.min(13, Math.max(9.5, Number(e.target.value) || 10.5)) })}
                    style={{ width: '100%', padding: '3px 6px', fontSize: '11px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>标题字号</span>
                    <span>{layoutConfig.titleFontSize ?? 12.5}pt</span>
                  </div>
                  <input
                    type="number" min="12" max="16" step="0.5" value={layoutConfig.titleFontSize ?? 12.5}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, titleFontSize: Math.min(16, Math.max(12, Number(e.target.value) || 12.5)) })}
                    style={{ width: '100%', padding: '3px 6px', fontSize: '11px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>页面边距</span>
                    <span>{layoutConfig.padding}mm</span>
                  </div>
                  <input 
                    type="range" min="10" max="30" value={layoutConfig.padding} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, padding: parseInt(e.target.value) })}
                    style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                  />
                </div>
                {layoutConfig.layoutStyle === 'double' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>左侧边距</span>
                        <span>{layoutConfig.doubleLeftPadding}mm</span>
                      </div>
                      <input
                        type="range" min="10" max="30" value={layoutConfig.doubleLeftPadding}
                        onChange={(e) => setLayoutConfig({ ...layoutConfig, doubleLeftPadding: parseInt(e.target.value) })}
                        style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>右侧边距</span>
                        <span>{layoutConfig.doubleRightPadding}mm</span>
                      </div>
                      <input
                        type="range" min="10" max="30" value={layoutConfig.doubleRightPadding}
                        onChange={(e) => setLayoutConfig({ ...layoutConfig, doubleRightPadding: parseInt(e.target.value) })}
                        style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                      />
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>模块间距</span>
                    <span>{layoutConfig.sectionMargin}px</span>
                  </div>
                  <input 
                    type="range" min="6" max="30" value={layoutConfig.sectionMargin} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, sectionMargin: parseInt(e.target.value) })}
                    style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>项目间距</span>
                    <span>{layoutConfig.itemMargin}px</span>
                  </div>
                  <input 
                    type="range" min="4" max="24" value={layoutConfig.itemMargin} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, itemMargin: parseInt(e.target.value) })}
                    style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>正文行高</span>
                    <span>{layoutConfig.lineHeight}</span>
                  </div>
                  <input 
                    type="range" min="1.3" max="1.9" step="0.05" value={layoutConfig.lineHeight} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, lineHeight: parseFloat(e.target.value) })}
                    style={{ width: '100%', height: '4px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Fonts & Title Style selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '11px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>字体选择</span>
                  <select 
                    value={layoutConfig.fontFamily} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, fontFamily: e.target.value })}
                    style={{ padding: '3px', background: 'var(--input-bg)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px' }}
                  >
                    <option value="Microsoft YaHei">微软雅黑（推荐）</option>
                    <option value="DengXian">等线（Office）</option>
                    <option value="SimSun">宋体（正式文档）</option>
                    <option value="Noto Sans SC">思源黑体</option>
                    <option value="Inter">Inter（英文简历）</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>标题装饰</span>
                  <select 
                    value={layoutConfig.titleStyle} 
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, titleStyle: e.target.value })}
                    style={{ padding: '3px', background: 'var(--input-bg)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '11px' }}
                  >
                    <option value="leftbar">▍ 左侧粗条</option>
                    <option value="bottomline">⎯ 下划分割线</option>
                    <option value="borderwrap">🔲 边框包裹</option>
                    <option value="plain">无修饰纯文本</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Modular Layout Sections Drag & Shifter */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--panel-border)', paddingTop: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>🧩 模块化版面排序与分栏</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sections.map((sec, idx) => (
                  <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>
                    <span style={{ fontWeight: '500' }}>{sec.name}</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {layoutConfig.layoutStyle === 'double' && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '2px 6px', fontSize: '10px', height: '20px', margin: 0, textTransform: 'none', background: 'rgba(255,255,255,0.05)' }}
                          onClick={() => handleSectionColToggle(sec.id)}
                        >
                          {sec.col === 'left' ? '➡️ 移至右栏' : '⬅️ 移至左栏'}
                        </button>
                      )}
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ width: '20px', height: '20px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        onClick={() => handleSectionOrderMove(sec.id, -1)}
                        disabled={idx === 0}
                      >
                        ▲
                      </button>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ width: '20px', height: '20px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        onClick={() => handleSectionOrderMove(sec.id, 1)}
                        disabled={idx === sections.length - 1}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Model Configuration Panel */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--panel-border)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>🤖 AI 润色引擎配置</span>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '2px 6px', fontSize: '10px', height: '18px', margin: 0, textTransform: 'none' }}
                  onClick={() => setAiConfig({ ...aiConfig, showSettings: !aiConfig.showSettings })}
                >
                  {aiConfig.showSettings ? '▲ 收起设置' : '⚙️ 展开配置'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <select 
                  value={aiConfig.engine} 
                  onChange={(e) => setAiConfig({ ...aiConfig, engine: e.target.value })}
                  style={{ width: '100%', padding: '4px', background: 'var(--input-bg)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px' }}
                >
                  <option value="lmstudio">LM Studio（本机）</option>
                  <option value="ollama">Ollama (本地运行小模型)</option>
                  <option value="gemini">Google Gemini Cloud (需要 Key)</option>
                  <option value="openai">OpenAI / 兼容接口 (需要 Key)</option>
                </select>
              </div>

              {aiConfig.showSettings && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
                  {aiConfig.engine === 'lmstudio' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>LM Studio 地址</label>
                        <input type="text" value={aiConfig.endpoint} onChange={(e) => setAiConfig({ ...aiConfig, endpoint: e.target.value })} style={{ fontSize: '11px', padding: '3px 6px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>已加载模型</label>
                        <input type="text" value={aiConfig.model} onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })} style={{ fontSize: '11px', padding: '3px 6px' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" type="button" onClick={checkLmStudioConnection} disabled={lmStudioStatus === 'checking'} style={{ height: '24px', padding: '2px 7px', fontSize: '10px' }}>
                          {lmStudioStatus === 'checking' ? '检测中…' : '检测连接'}
                        </button>
                        {lmStudioStatus === 'connected' && <span style={{ fontSize: '9px', color: '#10b981' }}>✓ 服务和当前模型可用</span>}
                        {lmStudioStatus === 'error' && <span style={{ fontSize: '9px', color: '#f87171' }}>⚠ {lmStudioError}</span>}
                      </div>
                    </>
                  )}
                  {aiConfig.engine === 'ollama' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>接口端点 (Endpoint)</label>
                        <input 
                          type="text" 
                          value={aiConfig.endpoint} 
                          onChange={(e) => setAiConfig({ ...aiConfig, endpoint: e.target.value })}
                          style={{ fontSize: '11px', padding: '3px 6px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>模型名称 (如 qwen2.5:1.5b)</label>
                        <input 
                          type="text" 
                          value={aiConfig.model} 
                          onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                          style={{ fontSize: '11px', padding: '3px 6px' }}
                        />
                      </div>
                      <span style={{ fontSize: '9px', color: '#10b981' }}>💡 请确保本地已开启 Ollama 并下载了对应模型</span>
                    </>
                  )}

                  {aiConfig.engine === 'gemini' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Gemini API Key</label>
                        <input 
                          type="password" 
                          placeholder="AIzaSy..." 
                          value={aiConfig.apiKey} 
                          onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                          style={{ fontSize: '11px', padding: '3px 6px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>模型名称</label>
                        <input 
                          type="text" 
                          value={aiConfig.model || 'gemini-1.5-flash'} 
                          onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                          style={{ fontSize: '11px', padding: '3px 6px' }}
                        />
                      </div>
                    </>
                  )}

                  {aiConfig.engine === 'openai' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>自定义 Endpoint</label>
                        <input 
                          type="text" 
                          placeholder="https://api.siliconflow.cn/v1" 
                          value={aiConfig.endpoint} 
                          onChange={(e) => setAiConfig({ ...aiConfig, endpoint: e.target.value })}
                          style={{ fontSize: '11px', padding: '3px 6px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>API Key</label>
                        <input 
                          type="password" 
                          placeholder="sk-..." 
                          value={aiConfig.apiKey} 
                          onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                          style={{ fontSize: '11px', padding: '3px 6px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>模型名称</label>
                        <input 
                          type="text" 
                          placeholder="Qwen/Qwen2.5-7B-Instruct" 
                          value={aiConfig.model} 
                          onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                          style={{ fontSize: '11px', padding: '3px 6px' }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 5. Local keyword coverage panel */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--panel-border)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>🔎 JD 关键词覆盖检查</span>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ padding: '2px 6px', fontSize: '10px', height: '18px', margin: 0, textTransform: 'none' }}
                  onClick={() => setShowMatcher(!showMatcher)}
                >
                  {showMatcher ? '▲ 收起分析' : '🔍 展开分析'}
                </button>
              </div>

              {showMatcher && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px' }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>粘贴招聘要求（JD），检查当前简历中的关键词覆盖情况</label>
                  <textarea 
                    placeholder="例如：招高级 Python 开发，需要有 YOLO 图像识别或大模型 RAG 项目背景..." 
                    value={jdText} 
                    onChange={(e) => setJdText(e.target.value)}
                    style={{ fontSize: '11px', minHeight: '60px', padding: '6px', background: 'var(--input-bg)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-primary)', width: '100%', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={handleJdMatch}
                      disabled={isMatching}
                      style={{ flex: 1, height: '26px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >
                      {isMatching ? '⏳ 检查中...' : '🔎 检查覆盖'}
                    </button>
                  </div>

                  {matchResult && (
                    <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>关键词覆盖率:</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: matchResult.score >= 85 ? '#10b981' : '#f59e0b' }}>
                          🎯 {matchResult.score}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px' }}>
                        {matchResult.matched.length > 0 && (
                          <div style={{ color: '#10b981' }}>
                            <strong>已覆盖类别:</strong> {matchResult.matched.join('、')}
                          </div>
                        )}
                        {matchResult.missing.length > 0 ? (
                          <div style={{ color: '#f87171', marginTop: '2px' }}>
                            <strong>待补充类别:</strong> {matchResult.missing.join('、')}
                          </div>
                        ) : (
                          <div style={{ color: '#10b981', marginTop: '2px', fontWeight: '500' }}>
                            ✓ 已覆盖当前规则中的全部 JD 类别。
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          
              </div>
            )}
          </div>
          
          <nav className="editor-tabs">
            <button 
              className={`tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
              onClick={() => setActiveTab('visual')}
            >
              🛠️ 可视化编辑
            </button>
            <button 
              className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              💻 代码/源码编辑
            </button>
          </nav>
          
          <div className="editor-content">
            {activeTab === 'visual' ? (
              <ResumeForm 
                resumeData={resumeData} 
                onChange={setResumeData} 
                onAIPolish={handleTriggerPolish}
              />
            ) : (
              <RawEditor resumeData={resumeData} onSync={setResumeData} />
            )}
          </div>
        </section>

        {/* Live Preview Panel */}
        <section className="preview-panel">
          <ResumePreview 
            resumeData={resumeData} 
            layoutConfig={layoutConfig} 
            sections={sections}
            onLayoutConfigChange={setLayoutConfig}
            onFieldChange={handlePreviewFieldChange}
            onAddProject={handleAddProjectFromPreview}
            onDeleteProject={handleDeleteProjectFromPreview}
            onFieldStyleChange={handlePreviewStyleChange}
          />
        </section>
      </main>

      {/* AI Polish Overlay Modal */}
      {polishModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ AI 简历描述智能润色助手
              </h3>
              <button 
                onClick={() => setPolishModal({ ...polishModal, isOpen: false })}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
              <div style={{ fontWeight: 'bold', color: '#e5e7eb', marginBottom: '4px' }}>原始描述：</div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap' }}>
                {polishModal.text || '(暂无内容)'}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 'bold', color: '#e5e7eb', fontSize: '13px', marginBottom: '8px' }}>
                🤖 AI 智能润色选项（点击直接采纳）：
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
                {polishModal.generatedOptions.map((opt, i) => (
                  <div 
                    key={i} 
                    className="polish-option-card"
                    onClick={() => {
                      const plain = opt.replace(/💡|🚀|🔥|\[.*?\]\s/g, '');
                      polishModal.onSave(plain);
                      setPolishModal({ ...polishModal, isOpen: false });
                    }}
                  >
                    <div style={{ fontSize: '12.5px', lineHeight: '1.5' }}>{opt}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setPolishModal({ ...polishModal, isOpen: false })}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
