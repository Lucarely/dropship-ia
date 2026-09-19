// app/api/orders/[id]/approve/route.js
//
// Endpoint chamado pelo botão "Aprovar pedido" no painel.
//
// O QUE ESTE ENDPOINT FAZ:
//   - Confirma que quem está chamando é um usuário autenticado com
//     role 'operator' ou 'admin' (via Supabase Auth + tabela profiles).
//   - Muda o status do pedido de 'aguardando_aprovacao' para 'aprovado'.
//   - Grava quem aprovou e quando.
//   - Registra no histórico.
//
// O QUE ESTE ENDPOINT DELIBERADAMENTE NÃO FAZ (ainda):
//   - Não envia o pedido ao fornecedor (CJ Dropshipping / Dropi).
//   - Não move nenhum valor em dinheiro.
//   Isso está bloqueado de propósito: ainda não existe integração real
//   com a API de nenhum fornecedor neste projeto. Criar uma função que
//   "parece" enviar o pedido sem uma integração de verdade seria
//   exatamente o tipo de automação fictícia que você pediu para evitar.
//
// Quando a integração com o fornecedor existir (Fase 7 do seu plano),
// a função sendToSupplier() abaixo deixa de lançar erro e passa a
// chamar a API real do fornecedor.

const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../../../../../lib/supabaseAdmin');

// Cliente "de leitura de sessão": usa a ANON KEY + o token do usuário
// logado, só para descobrir QUEM está fazendo a chamada e checar o
// papel dele — a escrita de fato usa supabaseAdmin (service role),
// mas só depois de validar a permissão.
function getRequestingUserClient(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function sendToSupplier(_order) {
  // BLOQUEADO DE PROPÓSITO — ver comentário no topo do arquivo.
  throw new Error(
    'Integração com fornecedor ainda não implementada. ' +
    'O pedido foi marcado como "aprovado", mas NENHUMA ação foi enviada ' +
    'ao fornecedor. Isso será feito na Fase 7 do plano, quando tivermos ' +
    'a API real do fornecedor configurada.'
  );
}

async function POST(request, { params }) {
  const orderId = params.id;

  const userClient = getRequestingUserClient(request);
  if (!userClient) {
    return new Response('Não autenticado', { status: 401 });
  }

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response('Sessão inválida', { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profileErr || !profile || !['admin', 'operator'].includes(profile.role)) {
    return new Response('Sem permissão para aprovar pedidos', { status: 403 });
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return new Response('Pedido não encontrado', { status: 404 });
  }

  if (order.status !== 'aguardando_aprovacao') {
    return new Response(
      `Pedido está em status "${order.status}", não em "aguardando_aprovacao". Nada foi alterado.`,
      { status: 409 }
    );
  }

  const { error: updateErr } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'aprovado',
      approved_by: userData.user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateErr) {
    return new Response(`Erro ao aprovar pedido: ${updateErr.message}`, { status: 500 });
  }

  await supabaseAdmin.from('order_status_history').insert({
    order_id: orderId,
    from_status: 'aguardando_aprovacao',
    to_status: 'aprovado',
    changed_by: userData.user.id,
    note: 'Aprovado manualmente pelo painel.',
  });

  // Tentamos avisar o fornecedor — isso vai falhar de propósito até a
  // Fase 7. Não deixamos o pedido preso por isso: ele já está
  // 'aprovado' no seu controle interno; só o envio ao fornecedor
  // continua pendente e visível como alerta.
  try {
    await sendToSupplier(order);
  } catch (err) {
    await supabaseAdmin.from('alerts').insert({
      kind: 'envio_fornecedor_pendente',
      order_id: orderId,
      message: err.message,
    });
  }

  return Response.json({
    ok: true,
    status: 'aprovado',
    aviso: 'Pedido aprovado no seu sistema. Envio ao fornecedor ainda é manual (ver alerts).',
  });
}

module.exports = { POST };
