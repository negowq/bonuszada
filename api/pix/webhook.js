// Recebe a confirmação da AllowPay. Valida a assinatura quando WEBHOOK_SECRET existe.
import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

async function raw(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = await raw(req);
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const exp = "sha256=" + crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
    const got = String(req.headers["x-allowpay-signature"] || "");
    const ok = got.length === exp.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(exp));
    if (!ok) return res.status(401).end();
  }
  // Aqui você pode registrar a venda (ex.: enviar à Utmify/Xtracky) usando evt.txid / evt.status.
  // O front já confirma via polling em /api/pix/status.
  return res.status(200).json({ received: true });
}
