(function () {
  const $ = (id) => document.getElementById(id);

  const form = $('valuationForm');
  const submitBtn = $('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = $('btnLoader');
  const methodTabs = document.querySelectorAll('.method-tab');
  const valuationMethod = $('valuationMethod');
  const costFields = $('costFields');
  const incomeFields = $('incomeFields');

  const resultCard = $('resultCard');
  const resultValue = $('resultValue');
  const resultMethod = $('resultMethod');
  const resultIndustry = $('resultIndustry');

  const reportPlaceholder = $('reportPlaceholder');
  const reportLoading = $('reportLoading');
  const reportContent = $('reportContent');
  const reportStreamPreview = $('reportStreamPreview');
  const errorBanner = $('errorBanner');

  let streamRenderTimer = null;

  const progressLabel = $('progressLabel');
  const progressPercent = $('progressPercent');
  const progressFill = $('progressFill');
  const aiLogList = $('aiLogList');

  const statusDot = $('statusDot');
  const statusText = $('statusText');

  const historyBtn = $('historyBtn');
  const historyOverlay = $('historyOverlay');
  const historyClose = $('historyClose');
  const historyList = $('historyList');
  const historyEmpty = $('historyEmpty');
  const historyCount = $('historyCount');
  const historyClearBtn = $('historyClearBtn');

  if (typeof marked !== 'undefined') {
    marked.setOptions({ gfm: true, breaks: true });
  }

  methodTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      methodTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      valuationMethod.value = tab.dataset.method;
      const cost = tab.dataset.method === 'cost';
      costFields.classList.toggle('hidden', !cost);
      incomeFields.classList.toggle('hidden', cost);
      setRequired(costFields, cost);
      setRequired(incomeFields, !cost);
    });
  });

  form.addEventListener('submit', onSubmit);
  historyBtn.addEventListener('click', openHistory);
  historyClose.addEventListener('click', closeHistory);
  historyOverlay.addEventListener('click', (e) => {
    if (e.target === historyOverlay) closeHistory();
  });
  historyClearBtn.addEventListener('click', clearHistory);
  historyList.addEventListener('click', onHistoryListClick);
  setStatus('pending', 'AI 待连接');

  function setStatus(type, text) {
    statusDot.className = 'status-dot ' + type;
    statusText.textContent = text;
  }

  function setRequired(el, yes) {
    el.querySelectorAll('input, textarea, select').forEach((n) => (n.required = yes));
  }

  function log(msg) {
    const line = document.createElement('div');
    line.className = 'ai-log-line';
    const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    line.textContent = t + ' ' + msg;
    aiLogList.appendChild(line);
    aiLogList.scrollTop = aiLogList.scrollHeight;
  }

  function setProgress(n, label) {
    const p = Math.max(0, Math.min(100, n));
    progressFill.style.width = p + '%';
    progressPercent.textContent = p + '%';
    if (label) progressLabel.textContent = label;
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.remove('hidden');
  }

  function hideError() {
    errorBanner.classList.add('hidden');
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    btnText.classList.toggle('hidden', on);
    btnLoader.classList.toggle('hidden', !on);
  }

  function scheduleStreamRender(md) {
    if (streamRenderTimer) return;
    streamRenderTimer = setTimeout(() => {
      streamRenderTimer = null;
      reportStreamPreview.classList.remove('hidden');
      reportStreamPreview.innerHTML = marked ? marked.parse(md) : md;
      reportStreamPreview.scrollTop = reportStreamPreview.scrollHeight;
    }, 100);
  }

  function showLoadingPanel() {
    reportPlaceholder.classList.add('hidden');
    reportContent.classList.add('hidden');
    reportStreamPreview.classList.add('hidden');
    reportLoading.classList.remove('hidden');
    aiLogList.innerHTML = '';
    setProgress(0, '准备中');
  }

  function hideLoadingPanel() {
    reportLoading.classList.add('hidden');
  }

  function showResult(calc) {
    resultCard.classList.remove('hidden');
    resultValue.textContent = calc.valuation_formatted;
    resultMethod.textContent = calc.method_label;
    resultIndustry.textContent = calc.industry_label;
  }

  function showReport(md) {
    reportPlaceholder.classList.add('hidden');
    reportStreamPreview.classList.add('hidden');
    reportContent.classList.remove('hidden');
    reportContent.innerHTML = marked ? marked.parse(md) : md;
  }

  async function onSubmit(e) {
    e.preventDefault();
    hideError();

    const payload = getFormData();
    const err = validate(payload);
    if (err) {
      showError(err);
      return;
    }

    setLoading(true);
    showLoadingPanel();

    log('本地计算估值');
    setProgress(5, '计算中');
    const calc = ValuationCalculator.calculate(payload);
    if (!calc.success) {
      showError(calc.error);
      setLoading(false);
      hideLoadingPanel();
      return;
    }

    showResult(calc.data);
    log('估值 ' + calc.data.valuation_formatted);

    const ai = await requestReport(calc.data, setProgress, log, scheduleStreamRender);

    if (!ai.ok) {
      showError(ai.error);
      setStatus('offline', 'AI 未连接');
      setLoading(false);
      hideLoadingPanel();
      return;
    }

    showReport(ai.report);
    setStatus('online', 'AI 已连接');
    saveHistory(calc.data, ai.report);
    setLoading(false);
    hideLoadingPanel();
  }

  function saveHistory(calc, report) {
    HistoryStore.add({
      id: String(Date.now()),
      savedAt: new Date().toISOString(),
      savedAtLabel: new Date().toLocaleString('zh-CN', { hour12: false }),
      calc,
      report,
    });
  }

  function openHistory() {
    renderHistoryList();
    historyOverlay.classList.remove('hidden');
    historyOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeHistory() {
    historyOverlay.classList.add('hidden');
    historyOverlay.setAttribute('aria-hidden', 'true');
  }

  function renderHistoryList() {
    const items = HistoryStore.list();
    historyCount.textContent = '共 ' + items.length + ' 条';
    historyList.innerHTML = '';

    if (!items.length) {
      historyEmpty.classList.remove('hidden');
      return;
    }

    historyEmpty.classList.add('hidden');
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.dataset.id = item.id;
      row.innerHTML =
        '<div class="history-item-main">' +
        '<div class="history-item-title">' +
        escapeHtml(item.calc.asset_name) +
        '</div>' +
        '<div class="history-item-meta">' +
        escapeHtml(item.calc.valuation_formatted) +
        ' · ' +
        escapeHtml(item.calc.method_label) +
        ' · ' +
        escapeHtml(item.calc.industry_label) +
        '</div>' +
        '<div class="history-item-time">' +
        escapeHtml(item.savedAtLabel) +
        '</div>' +
        '</div>' +
        '<button type="button" class="history-item-delete" data-id="' +
        item.id +
        '" aria-label="删除">删除</button>';
      historyList.appendChild(row);
    });
  }

  function onHistoryListClick(e) {
    const delBtn = e.target.closest('.history-item-delete');
    if (delBtn) {
      e.stopPropagation();
      HistoryStore.remove(delBtn.dataset.id);
      renderHistoryList();
      return;
    }

    const row = e.target.closest('.history-item');
    if (!row) return;

    const item = HistoryStore.get(row.dataset.id);
    if (!item) return;

    hideError();
    showResult(item.calc);
    showReport(item.report);
    setStatus('online', 'AI 已连接');
    closeHistory();
  }

  function clearHistory() {
    if (!HistoryStore.list().length) return;
    if (!confirm('确定清空全部本地历史记录？此操作不可恢复。')) return;
    HistoryStore.clear();
    renderHistoryList();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getFormData() {
    const method = valuationMethod.value;
    const base = {
      asset_name: $('assetName').value.trim(),
      industry_type: $('industryType').value,
      valuation_method: method,
    };
    if (method === 'cost') {
      return Object.assign(base, {
        acquisition_cost: $('acquisitionCost').value,
        storage_cost: $('storageCost').value,
        governance_cost: $('governanceCost').value,
      });
    }
    return Object.assign(base, {
      discount_rate: $('discountRate').value,
      revenue_forecast: $('revenueForecast').value.trim(),
    });
  }

  function validate(d) {
    if (!d.asset_name) return '请输入数据资产名称';
    if (!d.industry_type) return '请选择行业';
    if (d.valuation_method === 'cost') {
      for (const k of ['acquisition_cost', 'storage_cost', 'governance_cost']) {
        if (isNaN(parseFloat(d[k])) || parseFloat(d[k]) < 0) return '请填写有效成本';
      }
    } else {
      if (isNaN(parseFloat(d.discount_rate)) || parseFloat(d.discount_rate) <= 0) {
        return '请填写有效折现率';
      }
      if (!d.revenue_forecast) return '请填写收益预测';
    }
    return null;
  }
})();
