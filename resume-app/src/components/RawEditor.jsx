import React, { useState, useEffect } from 'react';
import { jsonToMarkdown, markdownToJson } from '../utils/markdownParser';

export default function RawEditor({ resumeData, onSync }) {
  const [editorMode, setEditorMode] = useState('json'); // 'json' or 'markdown'
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);

  // Sync state data -> editor text on load or format toggle
  useEffect(() => {
    if (editorMode === 'json') {
      setContent(JSON.stringify(resumeData, null, 2));
    } else {
      setContent(jsonToMarkdown(resumeData));
    }
    setError(null);
  }, [resumeData, editorMode]);

  const handleApply = () => {
    try {
      if (editorMode === 'json') {
        const parsed = JSON.parse(content);
        // Basic validation
        if (!parsed.personalInfo || !parsed.education || !parsed.skills || !parsed.projects) {
          throw new Error("缺少必要的简历节点（如 personalInfo, education 等）");
        }
        onSync(parsed);
      } else {
        const parsed = markdownToJson(content);
        onSync(parsed);
      }
      setError(null);
      alert("同步成功！");
    } catch (err) {
      setError(err.message || "解析失败，请检查格式是否正确。");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    alert("已复制到剪贴板！");
  };

  return (
    <div className="raw-editor-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn btn-sm ${editorMode === 'json' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEditorMode('json')}
          >
            JSON 格式
          </button>
          <button 
            className={`btn btn-sm ${editorMode === 'markdown' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEditorMode('markdown')}
          >
            Markdown 格式
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            📋 复制
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleApply}>
            🔄 同步到预览
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          color: '#ef4444', 
          padding: '10px 14px', 
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          ⚠️ <strong>格式错误：</strong> {error}
        </div>
      )}

      <textarea
        className="raw-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={editorMode === 'json' ? '请在此处编辑 JSON 简历...' : '请在此处编辑 Markdown 简历...'}
      />
    </div>
  );
}
