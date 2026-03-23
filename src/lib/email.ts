import { Resend } from "resend";
import { formatCurrency } from "./utils";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "pedidos@thedeposit.shop";

// ─── Shared helpers ──────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#1a1a1a;padding:28px 32px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:2px;">THE DEPOSIT</p>
              <p style="margin:4px 0 0;color:#aaaaaa;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Actualización de pedido</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
              <p style="margin:32px 0 0;font-size:12px;color:#999;text-align:center;">
                The Deposit · Aldea San Pedro Las Huertas, La Antigua Guatemala<br/>
                <a href="https://www.thedeposit.shop/tienda/mis-pedidos" style="color:#1a1a1a;">Ver mis pedidos</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoBox(content: string) {
  return `<div style="background:#f5f5f5;border-radius:6px;padding:16px;margin-top:24px;">${content}</div>`;
}

async function send(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

// ─── 1. Order Confirmation ────────────────────────────────────────────────────

interface OrderItem {
  productName: string;
  presentationName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderConfirmationData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  deliveryMethod: "envio" | "recoger_en_tienda";
  items: OrderItem[];
  total: number;
}

export async function sendOrderConfirmation(data: OrderConfirmationData) {
  const { customerName, customerEmail, orderId, deliveryMethod, items, total } = data;
  const shortId = orderId.slice(-8).toUpperCase();

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;">${item.productName} — ${item.presentationName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;">${formatCurrency(item.subtotal)}</td>
      </tr>`
    )
    .join("");

  const deliveryInfo =
    deliveryMethod === "recoger_en_tienda"
      ? infoBox(`
        <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1a1a1a;">Dónde recoger tu pedido:</p>
        <p style="margin:0;font-size:13px;color:#555;">Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala</p>
        <p style="margin:4px 0 0;font-size:13px;color:#555;">WhatsApp: <a href="https://wa.me/50254204805" style="color:#1a1a1a;">+502 5420-4805</a></p>`)
      : infoBox(`
        <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1a1a1a;">Tu pedido será enviado a domicilio.</p>
        <p style="margin:0;font-size:13px;color:#555;">Nos pondremos en contacto por WhatsApp para coordinar el envío.</p>
        <p style="margin:4px 0 0;font-size:13px;color:#555;">WhatsApp: <a href="https://wa.me/50254204805" style="color:#1a1a1a;">+502 5420-4805</a></p>`);

  const html = emailWrapper(`
    <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;">Hola, <strong>${customerName}</strong></p>
    <p style="margin:0 0 24px;font-size:13px;color:#555;">Tu pedido <strong>#${shortId}</strong> ha sido registrado exitosamente. Nos pondremos en contacto contigo pronto para confirmar los detalles.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#1a1a1a;">
          <th style="padding:8px 12px;text-align:left;color:#fff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Producto</th>
          <th style="padding:8px 12px;text-align:center;color:#fff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Cant.</th>
          <th style="padding:8px 12px;text-align:right;color:#fff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr style="background:#f5f5f5;">
          <td colspan="2" style="padding:10px 12px;font-weight:700;font-size:14px;color:#1a1a1a;">TOTAL</td>
          <td style="padding:10px 12px;font-weight:700;font-size:14px;color:#1a1a1a;text-align:right;">${formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
    ${deliveryInfo}`);

  await send(customerEmail, `Pedido #${shortId} recibido — The Deposit`, html);
}

// ─── 2. Order Status Update ───────────────────────────────────────────────────

type OrderStatus =
  | "revisado" | "confirmado" | "en_preparacion"
  | "enviado" | "entregado" | "cancelado"
  | "listo_para_recoger" | "recogido";

const ORDER_STATUS_MESSAGES: Partial<Record<OrderStatus, { subject: string; headline: string; body: string }>> = {
  confirmado: {
    subject: "Tu pedido fue confirmado",
    headline: "¡Pedido confirmado!",
    body: "Ya verificamos la disponibilidad de tus productos. Pronto comenzaremos a preparar tu pedido.",
  },
  en_preparacion: {
    subject: "Estamos preparando tu pedido",
    headline: "Tu pedido está en preparación",
    body: "Estamos armando tu pedido con cuidado. Te notificaremos cuando esté listo.",
  },
  listo_para_recoger: {
    subject: "Tu pedido está listo para recoger",
    headline: "¡Tu pedido está listo!",
    body: `Puedes pasar a recogerlo en:<br/>
      <strong>Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala</strong><br/>
      Si tienes dudas, escríbenos por WhatsApp: <a href="https://wa.me/50254204805" style="color:#1a1a1a;">+502 5420-4805</a>`,
  },
  enviado: {
    subject: "Tu pedido fue enviado",
    headline: "Tu pedido está en camino",
    body: "Tu pedido ya salió de nuestro almacén. Te contactaremos para coordinar la entrega.",
  },
  cancelado: {
    subject: "Tu pedido fue cancelado",
    headline: "Pedido cancelado",
    body: "Tu pedido ha sido cancelado. Si tienes preguntas, escríbenos por WhatsApp: <a href=\"https://wa.me/50254204805\" style=\"color:#1a1a1a;\">+502 5420-4805</a>",
  },
};

interface OrderStatusUpdateData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  status: OrderStatus;
  notesInternal?: string | null;
}

export async function sendOrderStatusUpdate(data: OrderStatusUpdateData) {
  const { customerName, customerEmail, orderId, status } = data;
  const msg = ORDER_STATUS_MESSAGES[status];
  if (!msg) return; // Don't send for non-notable status changes

  const shortId = orderId.slice(-8).toUpperCase();

  const html = emailWrapper(`
    <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;">Hola, <strong>${customerName}</strong></p>
    <p style="margin:0 0 16px;font-size:13px;color:#555;">Actualización de tu pedido <strong>#${shortId}</strong>:</p>
    <div style="background:#1a1a1a;border-radius:6px;padding:20px 24px;margin-bottom:16px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${msg.headline}</p>
    </div>
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">${msg.body}</p>`);

  await send(customerEmail, `${msg.subject} — The Deposit`, html);
}

// ─── 3. Shipment Update ───────────────────────────────────────────────────────

interface ShipmentUpdateData {
  customerName: string;
  customerEmail: string;
  orderId: string;
  status: "en_camino" | "entregado";
  carrierName: string;
  trackingNumber: string | null;
}

export async function sendShipmentUpdate(data: ShipmentUpdateData) {
  const { customerName, customerEmail, orderId, status, carrierName, trackingNumber } = data;
  const shortId = orderId.slice(-8).toUpperCase();

  const isDelivered = status === "entregado";

  const trackingInfo = trackingNumber
    ? `<p style="margin:4px 0 0;font-size:13px;color:#555;">Número de tracking: <strong>${trackingNumber}</strong></p>`
    : "";

  const content = isDelivered
    ? `
      <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;">Hola, <strong>${customerName}</strong></p>
      <p style="margin:0 0 16px;font-size:13px;color:#555;">Tu pedido <strong>#${shortId}</strong> ha sido entregado.</p>
      <div style="background:#1a1a1a;border-radius:6px;padding:20px 24px;margin-bottom:16px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">¡Pedido entregado!</p>
      </div>
      <p style="margin:0;font-size:13px;color:#555;">Gracias por tu compra. Si tienes alguna pregunta, no dudes en contactarnos.</p>
      ${infoBox(`<p style="margin:0;font-size:13px;color:#555;">WhatsApp: <a href="https://wa.me/50254204805" style="color:#1a1a1a;">+502 5420-4805</a></p>`)}`
    : `
      <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;">Hola, <strong>${customerName}</strong></p>
      <p style="margin:0 0 16px;font-size:13px;color:#555;">Tu pedido <strong>#${shortId}</strong> está en camino.</p>
      <div style="background:#1a1a1a;border-radius:6px;padding:20px 24px;margin-bottom:16px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">Tu pedido está en camino</p>
      </div>
      ${infoBox(`
        <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1a1a1a;">Detalles del envío:</p>
        <p style="margin:0;font-size:13px;color:#555;">Transportista: ${carrierName}</p>
        ${trackingInfo}
        <p style="margin:8px 0 0;font-size:13px;color:#555;">¿Preguntas? WhatsApp: <a href="https://wa.me/50254204805" style="color:#1a1a1a;">+502 5420-4805</a></p>`)}`;

  const subject = isDelivered
    ? `Pedido #${shortId} entregado — The Deposit`
    : `Pedido #${shortId} en camino — The Deposit`;

  await send(customerEmail, subject, emailWrapper(content));
}
