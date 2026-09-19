// lib/supabaseAdmin.js
//
// Cliente Supabase para uso SOMENTE no backend (webhook, rotas de API,
// jobs). Usa a SERVICE ROLE KEY, que ignora RLS — por isso este arquivo
// NUNCA deve ser importado em código que roda no navegador.
//
// PRECISO DE (variáveis de ambiente, configure no seu .env / painel do
// provedor de hospedagem — nunca commitá-las no git):
//   SUPABASE_URL              -> em Project Settings > API, no Supabase
//   SUPABASE_SERVICE_ROLE_KEY -> mesma página, campo "service_role" (secreta)

const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'PRECISO DE: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente. ' +
    'Encontre em Supabase > Project Settings > API.'
  );
}

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = { supabaseAdmin };
