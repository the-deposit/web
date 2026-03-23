import { Resend } from "resend";
import { formatCurrency } from "./utils";

const resend = new Resend(process.env.RESEND_API_KEY);

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
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px;">
          ${item.productName} — ${item.presentationName}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px; text-align: right;">
          ${formatCurrency(item.subtotal)}
        </td>
      </tr>`
    )
    .join("");

  const deliveryInfo =
    deliveryMethod === "recoger_en_tienda"
      ? `
      <div style="background: #f5f5f5; border-radius: 6px; padding: 16px; margin-top: 24px;">
        <p style="margin: 0 0 4px; font-weight: 600; font-size: 13px; color: #1a1a1a;">Dónde recoger tu pedido:</p>
        <p style="margin: 0; font-size: 13px; color: #555;">Calle Real Lote 25, Aldea San Pedro Las Huertas, La Antigua Guatemala</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #555;">WhatsApp: <a href="https://wa.me/50254204805" style="color: #1a1a1a;">+502 5420-4805</a></p>
      </div>`
      : `
      <div style="background: #f5f5f5; border-radius: 6px; padding: 16px; margin-top: 24px;">
        <p style="margin: 0 0 4px; font-weight: 600; font-size: 13px; color: #1a1a1a;">Tu pedido será enviado a domicilio.</p>
        <p style="margin: 0; font-size: 13px; color: #555;">Nos pondremos en contacto por WhatsApp para coordinar el envío.</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #555;">WhatsApp: <a href="https://wa.me/50254204805" style="color: #1a1a1a;">+502 5420-4805</a></p>
      </div>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin: 0; padding: 0; background: #f0f0f0; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0f0f0; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 8px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: #1a1a1a; padding: 28px 32px;">
              <p style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 2px;">THE DEPOSIT</p>
              <p style="margin: 4px 0 0; color: #aaaaaa; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Pedido recibido</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px; font-size: 15px; color: #1a1a1a;">Hola, <strong>${customerName}</strong></p>
              <p style="margin: 0 0 24px; font-size: 13px; color: #555;">Tu pedido <strong>#${shortId}</strong> ha sido registrado exitosamente. Nos pondremos en contacto contigo pronto para confirmar los detalles.</p>

              <!-- Items table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background: #1a1a1a;">
                    <th style="padding: 8px 12px; text-align: left; color: #ffffff; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Producto</th>
                    <th style="padding: 8px 12px; text-align: center; color: #ffffff; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Cant.</th>
                    <th style="padding: 8px 12px; text-align: right; color: #ffffff; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr style="background: #f5f5f5;">
                    <td colspan="2" style="padding: 10px 12px; font-weight: 700; font-size: 14px; color: #1a1a1a;">TOTAL</td>
                    <td style="padding: 10px 12px; font-weight: 700; font-size: 14px; color: #1a1a1a; text-align: right;">${formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>

              ${deliveryInfo}

              <p style="margin: 24px 0 0; font-size: 12px; color: #999; text-align: center;">
                The Deposit · Aldea San Pedro Las Huertas, La Antigua Guatemala<br/>
                <a href="https://www.thedeposit.shop/tienda/mis-pedidos" style="color: #1a1a1a;">Ver mis pedidos</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "pedidos@thedeposit.shop",
      to: customerEmail,
      subject: `Pedido #${shortId} recibido — The Deposit`,
      html,
    });
  } catch (err) {
    // Don't fail the order if email fails
    console.error("Error sending order confirmation email:", err);
  }
}
