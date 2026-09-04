// 部署前请填写你的 API Key（勿提交到公开仓库）
const AI_API = 'https://api.siliconflow.cn/v1/chat/completions';
const AI_KEY = '';
const AI_MODEL = 'Qwen/Qwen3.6-35B-A3B';

async function requestReport(calcData, onProgress, onLog, onChunk) {
  if (!AI_KEY) {
    return { ok: false, error: '请先在 js/ai.js 中配置 AI_KEY' };
  }

  onProgress(10, '连接 AI');
  onLog(AI_MODEL);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  try {
    const res = await fetch(AI_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + AI_KEY,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              '你是数据资产估值顾问。禁止自行计算金额，只能根据用户提供的系统计算结果写 Markdown 报告。',
          },
          {
            role: 'user',
            content: buildPrompt(calcData),
          },
        ],
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      let msg = text.slice(0, 200);
      try {
        const j = JSON.parse(text);
        msg = j.error?.message || j.error || j.message || msg;
      } catch (e) {}
      return { ok: false, error: 'HTTP ' + res.status + ': ' + msg };
    }

    onProgress(30, '等待响应');
    onLog('思考中…');

    const contentType = res.headers.get('content-type') || '';
    let report = '';

    if (res.body && contentType.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      let streamPackets = 0;
      let started = false;
      let lastLogChars = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamPackets++;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const piece = parseStreamContent(line);
          if (!piece) continue;

          if (!started) {
            started = true;
            onLog('开始输出');
            onProgress(50, '生成中');
          }

          report += piece;
          chunkCount++;
          if (onChunk) onChunk(report);

          const chars = report.length;
          if (chars - lastLogChars >= 400 || chunkCount % 8 === 0) {
            lastLogChars = chars;
            onLog('已接收 ' + chars + ' 字 · ' + streamPackets + ' 段流');
          }
          onProgress(Math.min(98, 50 + chars / 80), '生成中');
        }
      }
    } else {
      onProgress(60, '解析响应');
      const text = await res.text();
      const json = JSON.parse(text);
      report =
        json.choices?.[0]?.message?.content ||
        json.message?.content ||
        json.response ||
        '';
      if (report && onChunk) onChunk(report);
      onLog('已接收 ' + report.length + ' 字');
    }

    report = report.trim();
    if (!report) {
      return { ok: false, error: 'AI 返回空内容' };
    }

    onProgress(100, '完成');
    onLog('完成，共 ' + report.length + ' 字');
    return { ok: true, report };
  } catch (e) {
    if (e.name === 'AbortError') {
      return { ok: false, error: '请求超时' };
    }
    return { ok: false, error: e.message || '网络错误' };
  } finally {
    clearTimeout(timer);
  }
}

function parseStreamContent(line) {
  let s = line.trim();
  if (!s || s.startsWith(':')) return '';
  if (s.startsWith('data:')) s = s.slice(5).trim();
  if (s === '[DONE]') return '';
  try {
    const json = JSON.parse(s);
    return (
      json.choices?.[0]?.delta?.content ||
      json.choices?.[0]?.message?.content ||
      ''
    );
  } catch {
    return '';
  }
}

function buildPrompt(data) {
  return (
    '请根据以下系统计算结果撰写数据资产估值报告（Markdown）。禁止编造金额，只能引用下列数据：\n\n' +
    JSON.stringify(data, null, 2) +
    '\n\n章节：## 估值结果 ## 核心假设 ## 风险分析 ## 行业建议'
  );
}
