/**
 * 数据资产估值计算（纯 JavaScript，AI 禁止参与金额计算）
 */
const ValuationCalculator = (function () {
  'use strict';

  const {
    INDUSTRY_TYPES,
    VALUATION_METHODS,
    MAX_COST_VALUE,
    MAX_DISCOUNT_RATE,
    MIN_DISCOUNT_RATE,
    MAX_FORECAST_YEARS,
    MAX_STRING_LENGTH,
  } = CONFIG;

  function calculate(input) {
    const assetName = sanitizeString(input.asset_name);
    if (!assetName) {
      return { success: false, error: '数据资产名称无效或过长' };
    }

    const industry = input.industry_type || '';
    if (!INDUSTRY_TYPES[industry]) {
      return { success: false, error: '请选择有效的行业类型' };
    }

    const method = input.valuation_method || '';
    if (!VALUATION_METHODS[method]) {
      return { success: false, error: '请选择有效的估值方法' };
    }

    const result =
      method === 'cost' ? calculateCostMethod(input) : calculateIncomeMethod(input);

    if (!result.success) {
      return result;
    }

    const valuation = result.valuation;
    return {
      success: true,
      data: {
        asset_name: assetName,
        industry_type: industry,
        industry_label: INDUSTRY_TYPES[industry],
        valuation_method: method,
        method_label: VALUATION_METHODS[method],
        valuation: round2(valuation),
        valuation_formatted: formatCurrency(valuation),
        currency: 'CNY',
        breakdown: result.breakdown,
        calculated_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      },
    };
  }

  function calculateCostMethod(input) {
    const acquisition = parsePositiveNumber(input.acquisition_cost);
    if (acquisition === false) return { success: false, error: '获取成本无效' };

    const storage = parsePositiveNumber(input.storage_cost);
    if (storage === false) return { success: false, error: '存储成本无效' };

    const governance = parsePositiveNumber(input.governance_cost);
    if (governance === false) return { success: false, error: '治理成本无效' };

    const valuation = acquisition + storage + governance;

    if (valuation <= 0) {
      return { success: false, error: '成本法估值结果必须大于 0' };
    }
    if (valuation > MAX_COST_VALUE) {
      return { success: false, error: '估值金额超出系统允许上限' };
    }

    return {
      success: true,
      valuation,
      breakdown: {
        formula: '估值 = 获取成本 + 存储成本 + 治理成本',
        acquisition_cost: round2(acquisition),
        storage_cost: round2(storage),
        governance_cost: round2(governance),
        components: [
          { name: '获取成本', value: round2(acquisition) },
          { name: '存储成本', value: round2(storage) },
          { name: '治理成本', value: round2(governance) },
        ],
      },
    };
  }

  function calculateIncomeMethod(input) {
    const discountRate = parseDiscountRate(input.discount_rate);
    if (discountRate === false) {
      return { success: false, error: '折现率无效，请输入 0.01% ~ 99% 之间的数值' };
    }

    const revenues = parseRevenueForecast(input.revenue_forecast);
    if (revenues === false) {
      return { success: false, error: '收益预测无效，请输入 1~50 年的正数收益' };
    }

    const details = [];
    let valuation = 0;

    for (let i = 0; i < revenues.length; i++) {
      const year = i + 1;
      const revenue = revenues[i];
      const divisor = Math.pow(1 + discountRate, year);
      if (divisor <= 0 || !Number.isFinite(divisor)) {
        return { success: false, error: '折现计算溢出，请调整折现率或预测期' };
      }
      const pv = revenue / divisor;
      valuation += pv;
      details.push({
        year,
        revenue: round2(revenue),
        discount_factor: round6(divisor),
        present_value: round2(pv),
      });
    }

    if (valuation <= 0 || !Number.isFinite(valuation)) {
      return { success: false, error: '收益法估值结果无效' };
    }
    if (valuation > MAX_COST_VALUE) {
      return { success: false, error: '估值金额超出系统允许上限' };
    }

    return {
      success: true,
      valuation,
      breakdown: {
        formula: '估值 = Σ [未来收益 / (1 + 折现率)^年数]',
        discount_rate: discountRate,
        discount_rate_percent: round4(discountRate * 100),
        forecast_years: revenues.length,
        yearly_details: details,
      },
    };
  }

  function parseRevenueForecast(value) {
    if (value === null || value === undefined || value === '') return false;

    let items = [];
    if (Array.isArray(value)) {
      items = value;
    } else if (typeof value === 'string') {
      items = value
        .replace(/[，;|]/g, ',')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      return false;
    }

    if (items.length < 1 || items.length > MAX_FORECAST_YEARS) return false;

    const revenues = [];
    for (const item of items) {
      const num = parsePositiveNumber(item);
      if (num === false) return false;
      revenues.push(num);
    }
    return revenues;
  }

  function parsePositiveNumber(value) {
    if (value === null || value === undefined || value === '') return false;

    if (typeof value === 'string') {
      value = value.replace(/[,，\s]/g, '');
    }

    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return false;
    if (num > MAX_COST_VALUE) return false;
    return num;
  }

  function parseDiscountRate(value) {
    if (value === null || value === undefined || value === '') return false;

    if (typeof value === 'string') {
      value = value.replace(/[%\s，]/g, '');
    }

    let rate = Number(value);
    if (!Number.isFinite(rate)) return false;
    if (rate > 1) rate = rate / 100;
    if (rate <= MIN_DISCOUNT_RATE || rate >= MAX_DISCOUNT_RATE) return false;
    return rate;
  }

  function sanitizeString(value) {
    if (value === null || value === undefined) return false;
    const str = String(value).trim();
    if (!str || str.length > MAX_STRING_LENGTH) return false;
    return str;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function round4(n) {
    return Math.round(n * 10000) / 10000;
  }

  function round6(n) {
    return Math.round(n * 1000000) / 1000000;
  }

  function formatCurrency(amount) {
    return (
      '¥' +
      amount.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  return { calculate };
})();
