const API_BASE = (process.env.SEEC0DE_BILLING_URL || 'http://127.0.0.1:8787').replace(/\/+$/, '');

module.exports = { API_BASE };
