// Consulta o status do Pix. transactionId = "route:txid".
const BASE = "https://allow-gi0i.onrender.com";
// COLE AQUI a chave da AllowPay (fica só no servidor, o navegador nunca vê).
const ALLOWPAY_API_KEY = "allow_apikey_07nn1znm0iyi";

export default async function handler(req, res) {
  const key = process.env.ALLOWPAY_API_KEY || ALLOWPAY_API_KEY;
  if (!key || key.startsWith("COLE_AQUI")) return res.status(500).json({ error: "Gateway não configurado" });

  const id = String(req.query.transactionId || "");
  const i = id.indexOf(":");
  const route = id.slice(0, i);
  const txid = id.slice(i + 1);
  if (i < 1 || !/^[\w-]+$/.test(route) || !/^[\w-]+$/.test(txid)) {
    return res.status(400).json({ error: "transactionId inválido" });
  }

  try {
    const r = await fetch(
      `${BASE}/api/v2/allowpay-seller/payment-status/${txid}?route=${encodeURIComponent(route)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: key }) }
    );
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: d.error || "Erro ao consultar" });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ status: d.status === "approved" ? "COMPLETED" : d.status });
  } catch (e) {
    return res.status(502).json({ error: "Gateway indisponível" });
  }
}
