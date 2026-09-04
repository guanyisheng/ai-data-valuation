const CONFIG = {
  TIMEOUT_MS: 300000,

  MAX_COST_VALUE: 1000000000000,
  MAX_DISCOUNT_RATE: 0.99,
  MIN_DISCOUNT_RATE: 0.0001,
  MAX_FORECAST_YEARS: 50,
  MAX_STRING_LENGTH: 200,

  INDUSTRY_TYPES: {
    finance: '金融',
    healthcare: '医疗健康',
    retail: '零售电商',
    manufacturing: '智能制造',
    internet: '互联网科技',
    energy: '能源电力',
    government: '政务公共',
    other: '其他',
  },

  VALUATION_METHODS: {
    cost: '成本法',
    income: '收益法',
  },
};
