// Configuração da API Shopee
const crypto = require('crypto');

// URLs da API Shopee
const SHOPEE_API_BASE = {
  production: 'https://partner.shopeemobile.com',
  sandbox: 'https://partner.test-stable.shopeemobile.com',
};

// Configurações da aplicação
const SHOPEE_CONFIG = {
  partner_id: process.env.SHOPEE_PARTNER_ID || '1185765',
  partner_key:
    process.env.SHOPEE_PARTNER_KEY ||
    'shpk52447844616d65636e77716a6a676d696c646947466d67496c4c584c6e52',
  redirect_url:
    process.env.SHOPEE_REDIRECT_URL ||
    'https://shoppe-api-heqa.onrender.com',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',

  // Scopes necessários
  scopes: [
    'item.base',
    'item.fullinfo',
    'order.base',
    'order.details',
    'logistics.base',
    'shop.base',
    'promotion.base',
  ],
};

// Função para gerar assinatura
const generateSignature = (path, timestamp, accessToken = '', shopId = '') => {
  const partnerId = SHOPEE_CONFIG.partner_id;
  const partnerKey = SHOPEE_CONFIG.partner_key;

  let baseString = `${partnerId}${path}${timestamp}`;

  if (accessToken) {
    baseString += accessToken;
  }

  if (shopId) {
    baseString += shopId;
  }

  return crypto
    .createHmac('sha256', partnerKey)
    .update(baseString)
    .digest('hex');
};

// Função para gerar URL de autorização
const generateAuthUrl = () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = '/api/v2/shop/auth_partner';
  const signature = generateSignature(path, timestamp);

  const baseUrl = SHOPEE_API_BASE[SHOPEE_CONFIG.environment];

  return `${baseUrl}${path}?partner_id=${SHOPEE_CONFIG.partner_id}&timestamp=${timestamp}&sign=${signature}&redirect=${encodeURIComponent(SHOPEE_CONFIG.redirect_url)}`;
};

// Função para fazer requisições autenticadas
const makeAuthenticatedRequest = async (
  path,
  method = 'GET',
  data = null,
  accessToken = '',
  shopId = ''
) => {
  const axios = require('axios');

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(path, timestamp, accessToken, shopId);

    const baseUrl = SHOPEE_API_BASE[SHOPEE_CONFIG.environment];
    const url = `${baseUrl}${path}`;

    const params = {
      partner_id: SHOPEE_CONFIG.partner_id,
      timestamp,
      sign: signature,
    };

    if (accessToken) params.access_token = accessToken;
    if (shopId) params.shop_id = shopId;

    const config = {
      method,
      url,
      params,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    console.log('🔗 Shopee Request:', {
      url,
      params: { ...params, sign: signature.substring(0, 10) + '...' },
    });

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(
      '❌ Erro na requisição Shopee:',
      error.response?.data || error.message
    );
    throw error;
  }
};

// Função para testar conexão
const testConnection = async () => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/shop/get_shop_info';

    // Para teste, vamos tentar sem shop_id primeiro
    const signature = generateSignature(path, timestamp);
    const baseUrl = SHOPEE_API_BASE[SHOPEE_CONFIG.environment];

    console.log('🧪 Testando conexão Shopee...');
    console.log('Partner ID:', SHOPEE_CONFIG.partner_id);
    console.log('Environment:', SHOPEE_CONFIG.environment);
    console.log('Base URL:', baseUrl);

    return {
      success: true,
      message: 'Credenciais configuradas corretamente',
      config: {
        partner_id: SHOPEE_CONFIG.partner_id,
        environment: SHOPEE_CONFIG.environment,
        base_url: baseUrl,
        auth_url: generateAuthUrl(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error: error,
    };
  }
};

module.exports = {
  SHOPEE_CONFIG,
  generateAuthUrl,
  makeAuthenticatedRequest,
  generateSignature,
  testConnection,
};
