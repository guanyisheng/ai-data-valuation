# AI 数据资产估值系统

纯前端的数据资产估值工作台：**本地精算 + 大模型报告解读**。所有金额由 JavaScript 引擎计算，AI 仅基于结构化结果生成 Markdown 分析报告。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

---

## 界面预览

### 页面

<img width="100%" alt="估值参数与报告主界面" src="https://github.com/user-attachments/assets/a71d1316-d7cc-4142-b1cf-a252265912b0" />

<img width="100%" alt="估值方法切换与表单" src="https://github.com/user-attachments/assets/e99475b9-e56a-40f5-a74f-44f4918529fb" />

<img width="100%" alt="历史记录与本地缓存说明" src="https://github.com/user-attachments/assets/5c23d3fd-42e0-4077-9ded-8955c7a84b81" />

### 运行结果展示

<img width="480" alt="AI 估值报告生成结果" src="https://github.com/user-attachments/assets/456b2a51-e2e6-4a4a-8796-84b65b391580" />

---

## 功能特性

- **双估值方法**：成本法、收益法（DCF 折现）
- **行业上下文**：8 类行业标签注入 AI 报告
- **流式报告**：SSE 实时输出，进度条 + 日志
- **历史记录**：浏览器 localStorage 本地缓存（不上传服务器）
- **零后端**：静态 HTML/CSS/JS，可部署至 GitHub Pages

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/guanyisheng/ai-data-valuation.git
cd ai-data-valuation
```

### 2. 配置 API Key

编辑 `js/ai.js`，填入你的大模型 API Key：

```javascript
const AI_API = 'https://api.siliconflow.cn/v1/chat/completions';
const AI_KEY = 'sk-your-api-key-here';  // ← 在此填写
const AI_MODEL = 'Qwen/Qwen3.6-35B-A3B';
```

> **安全提示**：请勿将含真实 Key 的 `ai.js` 提交到公开仓库。本地开发可在填写 Key 后使用 `git update-index --assume-unchanged js/ai.js`，或改用私有部署。

也支持任意 **OpenAI 兼容接口**，修改 `AI_API` 和 `AI_MODEL` 即可。

### 3. 本地运行

直接用浏览器打开 `index.html`，或使用本地静态服务：

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

访问 `http://localhost:8080`

### 4. 部署到 GitHub Pages

1. 推送代码到 GitHub
2. 仓库 Settings → Pages → Source 选择 `main` 分支根目录
3. 保存后访问 `https://YOUR_USERNAME.github.io/REPO_NAME/`

---

## 项目结构

```
├── index.html          # 主页面
├── css/
│   └── style.css       # UI 样式
├── js/
│   ├── config.js       # 行业映射、数值边界常量
│   ├── calculate.js    # 估值引擎（成本法 / 收益法）
│   ├── ai.js           # 大模型 API 调用（需配置 Key）
│   ├── history.js      # 本地历史记录
│   └── main.js         # 页面逻辑
└── README.md
```

---

## 估值算法

### 成本法

```
估值 = 获取成本 + 存储成本 + 治理成本
```

### 收益法（DCF）

```
估值 = Σ [第 t 年收益 / (1 + 折现率)^t]
```

- 折现率支持 `10`（表示 10%）或 `0.10`
- 收益预测用逗号分隔，支持 1~50 年

---

## 数据流

```
用户输入 → calculate.js 精算 → 展示估值金额
                    ↓
            完整 JSON（含 industry_label、breakdown）
                    ↓
            ai.js 流式调用大模型 → Markdown 报告
                    ↓
            history.js 写入 localStorage
```

AI **禁止自行计算金额**，Prompt 中明确只能引用系统已算结果。

---

## 历史记录

点击右上角 **「历史记录」** 可查看本地缓存的估值报告。

- 存储位置：浏览器 `localStorage`
- 最多保存 50 条
- 清除浏览器数据后记录丢失
- **不会上传到任何服务器**

---

## 常见问题

### CORS 跨域错误

浏览器直连第三方 API 可能触发跨域限制。可选方案：

1. 使用支持 CORS 的 API 服务商
2. 自建 Nginx 反向代理（Key 放在服务端，不暴露在前端）
3. 本地使用浏览器插件临时禁用 CORS（仅开发调试）

### 报告失败但估值数字正常

说明本地精算正常，问题出在 AI 接口。检查 `AI_KEY`、模型名、网络及 CORS。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 · CSS3 · 原生 JavaScript |
| 精算 | 自研估值引擎 |
| 报告 | marked.js · SSE 流式解析 |
| 大模型 | OpenAI 兼容 API |

---

## 免责声明

本系统输出仅供 **内部参考、教学演示及方法论研究**，不构成投资、审计、法律或财务建议。正式数据资产入表或对外披露，请咨询具备资质的专业机构。

---

## License

MIT
