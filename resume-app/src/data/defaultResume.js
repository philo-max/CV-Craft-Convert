export const defaultResume = {
  personalInfo: {
    name: "王泽桐",
    intent: "Python 开发工程师 / AI 应用开发工程师",
    phone: "19801319254",
    email: "wzt72020@gmail.com",
    github: "github.com/philo-max",
    city: "北京",
    photo: "/avatar_placeholder.jpg"
  },
  education: {
    school: "北京财贸职业学院",
    major: "人工智能技术应用专业",
    degree: "专科",
    startDate: "2024.09",
    endDate: "2027.06",
    status: "大二在读",
    courses: [
      "Python程序设计",
      "Java程序设计",
      "MySQL数据库原理与应用",
      "工业物联网平台技术",
      "智能制造数据采集技术"
    ]
  },
  skills: [
    {
      "category": "编程语言 & 数据库",
      "items": ["精通 Python 核心编程与异步开发", "熟悉 Java 语言", "熟练掌握 MySQL 数据库设计与 SQL 调优"]
    },
    {
      "category": "人工智能 & 计算机视觉",
      "items": ["熟练掌握计算机视觉检测技术", "掌握 YOLOv8s 目标检测模型的训练与微调", "具备基于 OpenCV 的图像处理经验"]
    },
    {
      "category": "大模型 & 应用开发",
      "items": ["熟悉 RAG（检索增强生成）与 Agent（如 ReAct 架构）开发流程", "掌握 Chroma 向量数据库以及主流嵌入模型（如 BGE-M3）的应用"]
    },
    {
      "category": "工程协作 & AI 提效",
      "items": ["熟练使用 Git / GitHub 团队开发规范", "深刻理解 AI 辅助开发（Vibe Coding）流程，熟练使用 Claude Code、OpenAI Codex、Gemini 等大模型工具进行高效工程开发"]
    }
  ],
  projects: [
    {
      "name": "钢铁表面缺陷智能检测平台",
      "role": "独立开发者",
      "type": "独撰开源项目",
      "startDate": "2026.05",
      "endDate": "2026.06",
      "enabled": true,
      "repo": "https://github.com/philo-max/steel-defect-detection",
      "work": [
        "独立设计并开发了前后端分离的双重系统架构，前端基于 React + Vite，后端提供 FastAPI (Python) 与 C++ Drogon 双版本高性能服务，使用 Docker 进行模块化容器化部署。",
        "核心算法基于 YOLOv8s 深度学习模型，针对工业钢铁表面常见缺陷（划痕、斑点等）进行训练与调优；引入 VLM（视觉语言模型） 语义复核机制，对低置信度的检测结果进行多模态二次确认。",
        "结合 Chroma 向量数据库 与 BGE-M3 构建 RAG 知识检索库，实现根据国标及行业缺陷定义规范自动关联缺陷原因，提供智能化处置建议。"
      ],
      "outcomes": [
        "平台模型检测精度 mAP50 达到 0.906，大幅降低工业质检误报率。",
        "项目已在 GitHub 开源并持续进行版本迭代，目前稳定运行于 v3.1.0 版本。"
      ]
    },
    {
      "name": "Subdue 跨平台订阅管理应用",
      "role": "独立开发者",
      "type": "个人开源项目",
      "startDate": "2026.06",
      "endDate": "至今",
      "enabled": true,
      "repo": "https://github.com/philo-max/Subdue",
      "work": [
        "负责该项目全生命周期的管理，独立完成需求分析、产品需求文档（PRD）撰写及 UI/UX 界面原型设计。",
        "采用 React Native + Expo 框架构建移动端（iOS / Android），同时采用 Tauri + React + Vite 架构研发 light-weight 桌面端，实现多端核心逻辑与 UI 的高效复用。",
        "采用 Open-core 商业化服务架构，设计了基于本地 SQLite 加密存储与云端数据安全同步的混合架构，配合本地计划任务实现周期性订阅账单的提醒。"
      ],
      "outcomes": [
        "实现了跨平台订阅支出的无缝追踪与动态分析，成功闭环了从概念设计到全终端落地的完整产品生命周期。",
        "项目在 GitHub 持续迭代，并根据社区反馈不断优化性能与交互。"
      ]
    },
    {
      "name": "智能客服系统 - 鸿芯智谷",
      "role": "核心开发工程师",
      "type": "课程实训项目",
      "startDate": "2026.06",
      "endDate": "2026.06",
      "enabled": true,
      "repo": "https://github.com/philo-max/smart-customer-service-system",
      "work": [
        "参与智能客服的整体方案设计，基于 ReAct 架构 设计了大模型 Agent 的任务规划与工具调用决策流程，实现客服机器人的自主工单创建与查询。",
        "引入 BGE-M3 文本嵌入模型对企业内部文档进行向量化，结合 Chroma 向量数据库构建 RAG 语义检索模块，实现精准、可溯源的常见问题解答（FAQ）。",
        "针对 LLM 生成内容不确定性，设计了基于敏感词与大模型分类器的双层安全护栏；实现基于 Session ID 的多轮对话上下文状态记忆与压缩管理。"
      ],
      "outcomes": [
        "极大提升了客服答复的准确性与合规率，并在课程实训评比中获得“优秀项目”称号。",
        "项目代码已开源，便于社区开发者交流学习。"
      ]
    },
    {
      "name": "YouTube Shorts 自动化视频生成流水线",
      "role": "独立开发者",
      "type": "个人兴趣项目",
      "startDate": "2026.06",
      "endDate": "2026.07",
      "enabled": true,
      "repo": "https://github.com/philo-max/youtube-shorts-pipeline",
      "work": [
        "基于 n8n 自动化工作流与 Node.js 脚本，搭建了从 CSV 原始分镜脚本数据到 MP4 视频成片的自动化渲染与处理流水线。",
        "引入 Remotion 框架，将 HTML/CSS/React 页面渲染为动态视频，设计了自适应镜头缩放、字幕波形动效和转场动画。",
        "集成 Edge-TTS 与 OpenAI TTS 接口，实现多角色、高拟真语音合成与字幕音轨的时间轴自动对齐。"
      ],
      "outcomes": [
        "实现了短视频制作的零人工干预自动化生产，测试期间单次视频渲染时间在 30 秒以内。",
        "成功在 GitHub 发布 v1.0.0 开源版本。"
      ]
    },
    {
      "name": "3D 模型在线预览工具",
      "role": "核心开发工程师",
      "type": "大学生暑期社会实践项目",
      "startDate": "2025.07",
      "endDate": "2025.09",
      "enabled": false,
      "work": [
        "作为核心成员，负责基于 Three.js / WebGL 的 3D 模型在线渲染器的设计与开发。",
        "实现了对 OBJ、FBX、STL、GLTF 等多种主流 3D 格式模型的解析、加载与网格优化，并编写自定义着色器改善模型质感。",
        "开发了模型旋转、缩放、平移动态交互面板，并集成了在线文件格式转换服务。"
      ],
      "outcomes": [
        "该工具成功应用于暑期社会实践团队的数字化成果展示中，评比中荣获学校暑期社会实践评比三等奖。"
      ]
    },
    {
      "name": "企业级数据可视化大屏",
      "role": "团队参与者",
      "type": "团队开发项目",
      "startDate": "2025.10",
      "endDate": "2025.12",
      "enabled": false,
      "work": [
        "协助开发团队完成业务指标看板的开发，使用帆软 FineReport 进行复杂多维报表和实时可视化图表的设计。",
        "负责部分报表 SQL 查询编写及与核心数据源的 API 对接，完成大屏自适应排版调试。"
      ],
      "outcomes": [
        "成功按期交付，图表展示实时性与渲染速度得到客户认可。"
      ]
    }
  ],
  "honors": [
    "大学生暑期社会实践评比 三等奖（2025）",
    "联想测试工程师证书（认证通过）"
  ],
  "selfEvaluation": [
    "全链路工程与开源习惯：拥有极强的动手实践能力，独立完成 4 个从“需求定义 -> 原型设计（PRD/UI） -> 代码实现（FastAPI/React/Vue3/Tauri） -> 部署发布”的完整开源项目。习惯规范使用 Git / Git Flow 管理代码，具备良好的开源协作与文档编写规范。",
    "AI 提效与敏捷开发先锋：深度践行 AI 辅助开发（Vibe Coding）理念，熟练运用 Claude Code、Gemini、Codex 等大模型开发工具，将开发效率提升数倍，能够在一个月内独立高质完成复杂多架构的商业级应用研发。",
    "专注于 AI 与 CV 应用落地：在深度学习、目标检测（YOLOv8s）、Agent 决策逻辑、RAG 检索增强等前沿技术方面有实际项目落地经验，能快速理解业务需求并将最新的 AI 算法方案转化为实用的软件产品。"
  ]
}
