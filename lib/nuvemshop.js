// lib/nuvemshop.js
//
// Funções para (1) verificar a assinatura de um webhook da Nuvemshop e
// (2) buscar o pedido completo na API oficial, já que o webhook só
// manda {store_id, event, id} — o "payload fino" documentado pela
// Nuvemshop/Tiendanube.
//
// PRECISO DE (variáveis de ambiente):
//   NUVEMSHOP_APP_ID       -> Partners Portal > seu app
//   NUVEMSHOP_CLIENT_SECRET-> Partners Portal > seu app (usado para validar a assinatura HMAC)
//   NUVEMSHOP_ACCESS_TOKEN -> gerado quando você autoriza o app na SUA loja (fluxo OAuth)
//
// Sem essas três variáveis reais, este arquivo não deve ser usado —
// não existe um jeito de "simular" a API da Nuvemshop com segurança.

const crypto = require('crypto');

function verifyNuvemshopSignature(rawBody, hmacHeader) {
  const secret = process.env.NUVEMSHOP_CLIENT_SECRET;
  if (!secret) {
    throw new Error('PRECISO DE: NUVEMSHOP_CLIENT_SECRET não configurado.');
  }
  if (!hmacHeader) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody) // deve ser o corpo bruto (Buffer/string), antes do JSON.parse
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(expected));
  } catch {
    return false; // tamanhos diferentes = inválido
  }
}

async function fetchOrder(storeId, orderId) {
  const token = process.env.NUVEMSHOP_ACCESS_TOKEN;
  const appId = process.env.NUVEMSHOP_APP_ID;
  if (!token || !appId) {
    throw new Error('PRECISO DE: NUVEMSHOP_ACCESS_TOKEN e NUVEMSHOP_APP_ID configurados.');
  }

  const url = `https://api.nuvemshop.com.br/v1/${storeId}/orders/${orderId}`;
  const res = await fetch(url, {
    headers: {
      Authentication: `bearer ${token}`,
      'User-Agent': `Operacao Dropshipping IA (${appId})`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Falha ao buscar pedido ${orderId} na Nuvemshop (HTTP ${res.status}). ` +
      `Resposta da API: ${body}`
    );
  }

  return res.json();
}

module.exports = { verifyNuvemshopSignature, fetchOrder };
