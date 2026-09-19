// app/api/webhooks/nuvemshop/route.js
// (Next.js App Router — se seu projeto usar outra estrutura, a lógica
// de dentro de POST() é a mesma, só muda como você lê raw body/headers)
//
// O que este endpoint FAZ:
//   1. Verifica a assinatura HMAC do webhook (garante que veio da Nuvemshop).
//   2. Lê o payload fino {store_id, event, id} e busca o pedido completo
//      na API da Nuvemshop.
//   3. Grava/atualiza cliente, endereço, produtos do pedido, pagamento
//      e o pedido em si no Supabase.
//   4. Todo pedido NOVO nasce com status = 'aguardando_aprovacao'
//      (default do banco). Se o mesmo pedido chegar de novo (reenvio
//      do webhook, ou order/paid depois de order/created), o status
//      atual NÃO é sobrescrito — ver o comentário em upsertOrder().
//
// O que este endpoint NUNCA FAZ:
//   - Não envia dinheiro a fornecedor.
//   - Não cria pedido automaticamente no fornecedor (CJ/Dropi).
//   - Não muda status para 'aprovado' sozinho.
//   Essas ações só acontecem quando um humano clicar em "Aprovar pedido"
//   no painel (ver etapa 3), e mesmo assim a parte financeira real com o
//   fornecedor está bloqueada até termos essa integração (ver aviso no
//   final do arquivo approve-order).

const { verifyNuvemshopSignature, fetchOrder } = require('../../../../lib/nuvemshop');
const { supabaseAdmin } = require('../../../../lib/supabaseAdmin');

// Eventos que este endpoint sabe processar. Qualquer outro evento é
// apenas confirmado (200 OK) e ignorado, para a Nuvemshop não ficar
// re-tentando entrega de eventos que não usamos ainda.
const HANDLED_EVENTS = new Set(['order/created', 'order/paid']);

async function POST(request) {
  const rawBody = await request.text(); // precisa ser o corpo BRUTO para a assinatura bater
  const hmacHeader = request.headers.get('x-linkedstore-hmac-sha256');

  let valid;
  try {
    valid = verifyNuvemshopSignature(rawBody, hmacHeader);
  } catch (err) {
    // Normalmente cai aqui se NUVEMSHOP_CLIENT_SECRET não estiver configurado.
    console.error('Erro ao verificar assinatura do webhook:', err.message);
    return new Response('Configuração ausente no servidor', { status: 500 });
  }

  if (!valid) {
    console.warn('Webhook da Nuvemshop rejeitado: assinatura inválida.');
    return new Response('Assinatura inválida', { status: 401 });
  }

  const payload = JSON.parse(rawBody); // { store_id, event, id }
  const { store_id: platformStoreId, event, id: platformOrderId } = payload;

  if (!HANDLED_EVENTS.has(event)) {
    return new Response('OK (evento ignorado)', { status: 200 });
  }

  // 1) A loja precisa já estar cadastrada em public.stores com o
  //    access_token correto. Não criamos loja "na hora" — isso exige
  //    o fluxo de autorização OAuth feito uma vez, manualmente.
  const { data: store, error: storeErr } = await supabaseAdmin
    .from('stores')
    .select('id, platform_store_id')
    .eq('platform', 'nuvemshop')
    .eq('platform_store_id', String(platformStoreId))
    .maybeSingle();

  if (storeErr) {
    console.error('Erro ao consultar loja:', storeErr.message);
    return new Response('Erro interno', { status: 500 });
  }

  if (!store) {
    // Confirmamos o recebimento (200) para a Nuvemshop não ficar
    // re-entregando, mas registramos um alerta: falta configurar a loja.
    await supabaseAdmin.from('alerts').insert({
      kind: 'loja_nao_configurada',
      message: `Recebido webhook de store_id=${platformStoreId} sem registro em public.stores. ` +
        `PRECISO DE: cadastrar essa loja (platform_store_id, access_token) antes de processar pedidos dela.`,
    });
    return new Response('OK (loja não configurada — veja alerts)', { status: 200 });
  }

  // 2) Buscar o pedido completo — o webhook não traz os dados, só o id.
  let order;
  try {
    order = await fetchOrder(store.platform_store_id, platformOrderId);
  } catch (err) {
    console.error('Erro ao buscar pedido na Nuvemshop:', err.message);
    // Não confirmamos com 200 aqui de propósito: queremos que a
    // Nuvemshop tente de novo mais tarde, caso seja instabilidade
    // temporária da API.
    return new Response('Erro ao buscar pedido na Nuvemshop', { status: 502 });
  }

  try {
    await upsertOrder(store.id, order);
  } catch (err) {
    console.error('Erro ao gravar pedido no Supabase:', err.message);
    await supabaseAdmin
      .from('alerts')
      .insert({
        kind: 'falha_gravacao_pedido',
        message: `Falha ao gravar pedido ${platformOrderId} (loja ${platformStoreId}): ${err.message}`,
      })
      .then(null, () => {}); // se até o alerta falhar, não deixamos isso derrubar a resposta
    return new Response('Erro ao gravar pedido', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}

async function upsertOrder(storeUuid, order) {
  // --- Cliente -------------------------------------------------
  const customerPayload = order.customer || {};
  const { data: customer, error: custErr } = await supabaseAdmin
    .from('customers')
    .upsert(
      {
        store_id: storeUuid,
        platform_customer_id: customerPayload.id ? String(customerPayload.id) : null,
        name: customerPayload.name || order.contact_name || null,
        email: customerPayload.email || order.contact_email || null,
        phone: customerPayload.phone || order.contact_phone || null,
        document: customerPayload.identification || order.contact_identification || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id,platform_customer_id' }
    )
    .select('id')
    .single();

  if (custErr) throw new Error(`Falha ao gravar cliente: ${custErr.message}`);

  // --- Endereço de entrega --------------------------------------
  let shippingAddressId = null;
  if (order.shipping_address || order.shipping_zipcode) {
    const addr = order.shipping_address || {};
    const { data: address, error: addrErr } = await supabaseAdmin
      .from('addresses')
      .insert({
        customer_id: customer.id,
        kind: 'shipping',
        zipcode: addr.zipcode || order.shipping_zipcode || null,
        street: addr.address || order.shipping_address_street || null,
        number: addr.number || order.shipping_number || null,
        floor: addr.floor || order.shipping_floor || null,
        locality: addr.locality || order.shipping_locality || null,
        city: addr.city || order.shipping_city || null,
        state: addr.province || addr.state || order.shipping_province || null,
        country: addr.country || order.shipping_country || null,
        phone: addr.phone || order.shipping_phone || null,
      })
      .select('id')
      .single();
    if (addrErr) throw new Error(`Falha ao gravar endereço: ${addrErr.message}`);
    shippingAddressId = address.id;
  }

  // --- Pedido ----------------------------------------------------
  // Checagem de idempotência: se este pedido já existe (webhook
  // reenviado, ou order/created seguido de order/paid para o mesmo
  // pedido), NÃO tocamos no campo `status`. Isso evita dois problemas
  // reais: (1) criar um pedido duplicado — impossível de qualquer
  // forma graças à constraint unique(store_id, platform_order_id) —
  // e (2) o bug mais sério: reprocessar o webhook e resetar de volta
  // para 'aguardando_aprovacao' um pedido que um humano já tinha
  // marcado como 'aprovado' no painel.
  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('store_id', storeUuid)
    .eq('platform_order_id', String(order.id))
    .maybeSingle();
  const isNewOrder = !existingOrder;

  const { data: savedOrder, error: orderErr } = await supabaseAdmin
    .from('orders')
    .upsert(
      {
        store_id: storeUuid,
        platform_order_id: String(order.id),
        order_number: order.number ? String(order.number) : null,
        customer_id: customer.id,
        shipping_address_id: shippingAddressId,
        // "status" propositalmente OMITIDO daqui: na criação, a coluna
        // usa o DEFAULT do banco ('aguardando_aprovacao' — ver
        // 01_schema.sql); numa atualização, omitir o campo faz o
        // upsert não sobrescrevê-lo, preservando 'aprovado' e outros
        // status definidos manualmente no painel.
        payment_status: order.payment_status || null,
        shipping_status: order.shipping_status || null,
        currency: order.currency || 'BRL',
        subtotal_cents: order.subtotal ?? null,
        shipping_cents: order.shipping ?? null,
        discount_cents: order.discount ?? null,
        total_cents: order.total,
        raw_payload: order, // guarda o JSON bruto para auditoria/depuração
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id,platform_order_id' }
    )
    .select('id, status')
    .single();

  if (orderErr) throw new Error(`Falha ao gravar pedido: ${orderErr.message}`);

  // --- Itens do pedido --------------------------------------------
  // Reprocessamento seguro: apaga itens antigos deste pedido (se o
  // webhook chegar duas vezes) e regrava a partir do payload atual.
  await supabaseAdmin.from('order_items').delete().eq('order_id', savedOrder.id);

  const items = (order.products || []).map((p) => ({
    order_id: savedOrder.id,
    platform_product_id: p.product_id ? String(p.product_id) : null,
    name: p.name,
    sku: p.sku || null,
    quantity: p.quantity || 1,
    unit_price_cents: p.price != null ? Math.round(Number(p.price) * 100) : null,
    // supplier_id fica nulo aqui de propósito: associar produto ao
    // fornecedor é uma etapa manual/curada (Fase 4 do seu plano),
    // não algo que o webhook deveria inventar.
  }));

  if (items.length > 0) {
    const { error: itemsErr } = await supabaseAdmin.from('order_items').insert(items);
    if (itemsErr) throw new Error(`Falha ao gravar itens do pedido: ${itemsErr.message}`);
  }

  // --- Pagamento (registro informativo, não uma ação) -------------
  // Mesma lógica de idempotência dos itens: apaga o snapshot anterior
  // de pagamento deste pedido e regrava o atual. Isso é uma decisão
  // deliberada de escopo (Fase 2 trata pagamento como espelho do
  // status da Nuvemshop, não como um livro-razão de múltiplas
  // transações) — se no futuro precisarmos histórico de pagamentos
  // parciais/reembolsos, essa tabela passa a precisar de upsert por
  // platform_payment_id em vez de delete+insert.
  await supabaseAdmin.from('payments').delete().eq('order_id', savedOrder.id);
  if (order.gateway || order.payment_status) {
    await supabaseAdmin.from('payments').insert({
      order_id: savedOrder.id,
      gateway: order.gateway || null,
      status: order.payment_status || null,
      amount_cents: order.total ?? null,
      raw_payload: order.payment_details || null,
    });
  }

  // --- Histórico ----------------------------------------------------
  // Só registramos "criado automaticamente" na primeira vez que este
  // pedido aparece. Reentregas do mesmo webhook (ou order/paid vindo
  // depois de order/created) não devem gerar entradas repetidas.
  if (isNewOrder) {
    await supabaseAdmin.from('order_status_history').insert({
      order_id: savedOrder.id,
      from_status: null,
      to_status: savedOrder.status,
      note: 'Criado automaticamente pelo webhook da Nuvemshop.',
    });
  }
}

module.exports = { POST };
