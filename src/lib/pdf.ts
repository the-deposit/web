import { jsPDF } from "jspdf";
import { formatCurrency, formatDate } from "./utils";

interface InvoiceItem {
  productName: string;
  presentationName: string;
  quantity: number;
  salePrice: number;
  measure?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerNit: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  total: number;
  date: Date;
}

export function generateInvoicePDF(data: InvoiceData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header background
  doc.setFillColor(26, 26, 26); // #1A1A1A
  doc.rect(0, 0, pageWidth, 45, "F");

  // Logo/Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("THE DEPOSIT", margin, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text("Calle Real Lote 25, Aldea San Pedro Las Huertas", margin, y + 20);
  doc.text("La Antigua Guatemala · +502 5420-4805", margin, y + 26);
  doc.text("pedidos@thedeposit.shop · www.thedeposit.shop", margin, y + 32);

  // Invoice number top right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(data.invoiceNumber, pageWidth - margin, y + 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text("FACTURA", pageWidth - margin, y + 20, { align: "right" });
  doc.text(formatDate(data.date), pageWidth - margin, y + 26, { align: "right" });

  y = 55;

  // Customer info section
  doc.setTextColor(26, 26, 26);
  doc.setFillColor(245, 245, 245); // #F5F5F5
  doc.rect(margin, y, contentWidth, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DATOS DEL CLIENTE", margin + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nombre: ${data.customerName}`, margin + 4, y + 14);
  doc.text(`NIT: ${data.customerNit}`, margin + contentWidth / 2, y + 14);
  if (data.customerAddress) {
    doc.text(`Dirección: ${data.customerAddress}`, margin + 4, y + 20);
  }

  y += 32;

  // Items table header
  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DESCRIPCIÓN", margin + 3, y + 5.5);
  doc.text("CANT.", margin + contentWidth * 0.6, y + 5.5);
  doc.text("PRECIO UNIT.", margin + contentWidth * 0.72, y + 5.5);
  doc.text("SUBTOTAL", margin + contentWidth * 0.88, y + 5.5);

  y += 8;

  // Items
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  data.items.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [249, 249, 249];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.rect(margin, y, contentWidth, 10, "F");

    const description = `${item.productName} - ${item.presentationName}${item.measure ? ` (${item.measure})` : ""}`;
    const maxDescWidth = contentWidth * 0.55;
    const truncatedDesc = doc.splitTextToSize(description, maxDescWidth)[0];

    doc.text(truncatedDesc, margin + 3, y + 6.5);
    doc.text(String(item.quantity), margin + contentWidth * 0.62, y + 6.5, { align: "center" });
    doc.text(formatCurrency(item.salePrice), margin + contentWidth * 0.72, y + 6.5);
    doc.text(
      formatCurrency(item.salePrice * item.quantity),
      margin + contentWidth - 3,
      y + 6.5,
      { align: "right" }
    );

    y += 10;

    // New page if needed
    if (y > 260) {
      doc.addPage();
      y = margin;
    }
  });

  // Border under items
  doc.setDrawColor(224, 224, 224);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Totals
  const totalsX = margin + contentWidth * 0.6;
  const valuesX = margin + contentWidth;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(data.subtotal), valuesX, y, { align: "right" });
  y += 7;

  if (data.discount && data.discount > 0) {
    doc.setTextColor(34, 197, 94); // success green
    doc.text("Descuento:", totalsX, y);
    doc.text(`-${formatCurrency(data.discount)}`, valuesX, y, { align: "right" });
    y += 7;
    doc.setTextColor(26, 26, 26);
  }

  // Total line
  doc.setFillColor(26, 26, 26);
  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.45, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", totalsX + 2, y + 7);
  doc.text(formatCurrency(data.total), valuesX - 3, y + 7, { align: "right" });

  y += 20;

  // Footer
  doc.setTextColor(102, 102, 102);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Gracias por su compra en The Deposit.", pageWidth / 2, y, { align: "center" });
  doc.text("Este documento es un comprobante de venta interno.", pageWidth / 2, y + 5, { align: "center" });

  // Open in new tab for print
  const pdfOutput = doc.output("bloburl");
  window.open(pdfOutput as unknown as string, "_blank");
}

export async function generateInvoicePDFBlob(data: InvoiceData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("THE DEPOSIT", margin, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text("Calle Real Lote 25, Aldea San Pedro Las Huertas", margin, y + 20);
  doc.text("La Antigua Guatemala · +502 5420-4805", margin, y + 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(data.invoiceNumber, pageWidth - margin, y + 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text(formatDate(data.date), pageWidth - margin, y + 26, { align: "right" });

  y = 55;

  doc.setTextColor(26, 26, 26);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Cliente: ${data.customerName}`, margin + 4, y + 7);
  doc.text(`NIT: ${data.customerNit}`, margin + 4, y + 13);

  y += 25;

  doc.setFillColor(26, 26, 26);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DESCRIPCIÓN", margin + 3, y + 5.5);
  doc.text("CANT.", margin + contentWidth * 0.6, y + 5.5);
  doc.text("PRECIO", margin + contentWidth * 0.72, y + 5.5);
  doc.text("SUBTOTAL", margin + contentWidth * 0.88, y + 5.5);
  y += 8;

  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  data.items.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? [255, 255, 255] : [249, 249, 249];
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.rect(margin, y, contentWidth, 10, "F");
    const desc = `${item.productName} - ${item.presentationName}`;
    doc.text(doc.splitTextToSize(desc, contentWidth * 0.55)[0], margin + 3, y + 6.5);
    doc.text(String(item.quantity), margin + contentWidth * 0.62, y + 6.5, { align: "center" });
    doc.text(formatCurrency(item.salePrice), margin + contentWidth * 0.72, y + 6.5);
    doc.text(formatCurrency(item.salePrice * item.quantity), margin + contentWidth - 3, y + 6.5, { align: "right" });
    y += 10;
  });

  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  const totalsX = margin + contentWidth * 0.6;
  const valuesX = margin + contentWidth;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(data.subtotal), valuesX, y, { align: "right" });
  y += 7;

  if (data.discount && data.discount > 0) {
    doc.setTextColor(34, 197, 94);
    doc.text(`Descuento: -${formatCurrency(data.discount)}`, totalsX, y);
    y += 7;
    doc.setTextColor(26, 26, 26);
  }

  doc.setFillColor(26, 26, 26);
  doc.rect(margin + contentWidth * 0.55, y, contentWidth * 0.45, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", totalsX + 2, y + 7);
  doc.text(formatCurrency(data.total), valuesX - 3, y + 7, { align: "right" });

  return doc.output("blob");
}
