import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { SaleDocument } from './sale.schema';

@Injectable()
export class PdfService {
  generateInvoicePdf(sale: SaleDocument): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Shop Brand Colors
    const primaryColor = '#0f172a'; // slate-900
    const accentColor = '#2563eb'; // blue-600
    const lightGray = '#f1f5f9'; // slate-100
    const textGray = '#475569'; // slate-600
    const borderGray = '#cbd5e1'; // slate-300

    // Header Background Accent Bar
    doc
      .rect(0, 0, doc.page.width, 10)
      .fill(accentColor);

    const shopName = process.env.SHOP_NAME || 'HARDWARE HUB';

    // Store Info & Logo Area
    doc
      .fontSize(22)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text(shopName, 40, 35)
      .fontSize(10)
      .font('Helvetica')
      .fillColor(textGray)
      .text('Tools, Building Materials & Industrial Supplies', 40, 62)
      .text('124 Industrial Avenue, Tool District, City - 110001', 40, 75)
      .text('Phone: +91 98765 43210 | Email: billing@hardwarehub.com', 40, 88)
      .text('GSTIN / Tax ID: 27AABCH1234F1Z9', 40, 101);

    // Invoice Title & Badge
    const isReturn = sale.status === 'returned' || (sale.refundAmount && sale.refundAmount > 0);
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(isReturn ? '#dc2626' : accentColor)
      .text(isReturn ? 'RETURN / REVISED INVOICE' : 'INVOICE / BILL', 320, 35, { align: 'right', width: 235 })
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(`Invoice #: ${sale.invoiceNumber}`, 380, 62, { align: 'right' })
      .font('Helvetica')
      .fillColor(textGray)
      .text(`Date: ${new Date((sale as any).createdAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}`, 380, 77, { align: 'right' })
      .text(`Payment: ${sale.paymentMethod || 'Cash'}`, 380, 92, { align: 'right' });

    // Divider Line
    doc
      .moveTo(40, 125)
      .lineTo(doc.page.width - 40, 125)
      .strokeColor(borderGray)
      .lineWidth(1)
      .stroke();

    // Bill To Section Box
    doc
      .rect(40, 135, doc.page.width - 80, 52)
      .fill(lightGray);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(textGray)
      .text('BILL TO / CUSTOMER DETAILS:', 52, 143)
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text(sale.customerName || 'Walk-in Customer', 52, 156)
      .fontSize(9)
      .font('Helvetica')
      .fillColor(textGray)
      .text(sale.customerPhone ? `Contact: ${sale.customerPhone}` : 'Contact: N/A', 52, 170)
      .text(sale.customerAddress ? `Address: ${sale.customerAddress}` : '', 280, 156);

    // Items Table Header
    const tableTop = 205;
    doc
      .rect(40, tableTop, doc.page.width - 80, 24)
      .fill(primaryColor);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('#', 50, tableTop + 7)
      .text('ITEM & DESCRIPTION', 80, tableTop + 7)
      .text('SKU', 260, tableTop + 7)
      .text('QTY', 330, tableTop + 7, { width: 45, align: 'center' })
      .text('UNIT PRICE (Rs.)', 380, tableTop + 7, { width: 75, align: 'right' })
      .text('TOTAL (Rs.)', 465, tableTop + 7, { width: 85, align: 'right' });

    // Items Rows
    let currentY = tableTop + 24;
    const items = sale.items || [];

    items.forEach((item, index) => {
      // Row alternating background
      if (index % 2 === 1) {
        doc
          .rect(40, currentY, doc.page.width - 80, 22)
          .fill('#f8fafc');
      }

        const qtyDisplay = (item.returnedQuantity && item.returnedQuantity > 0)
          ? `${item.quantity} ${item.unit || 'pcs'} (-${item.returnedQuantity})`
          : `${item.quantity} ${item.unit || 'pcs'}`;

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(primaryColor)
          .text((index + 1).toString(), 50, currentY + 6)
          .text(item.productName, 80, currentY + 6, { width: 175, lineBreak: false })
          .fillColor(textGray)
          .text(item.sku || '-', 260, currentY + 6)
          .fillColor(primaryColor)
          .text(qtyDisplay, 320, currentY + 6, { width: 65, align: 'center' })
          .text(`Rs. ${item.unitPrice.toFixed(2)}`, 380, currentY + 6, { width: 75, align: 'right' })
          .font('Helvetica-Bold')
          .text(`Rs. ${item.subtotal.toFixed(2)}`, 465, currentY + 6, { width: 85, align: 'right' });

        currentY += 22;
      });

      // Bottom border of table
      doc
        .moveTo(40, currentY + 2)
        .lineTo(doc.page.width - 40, currentY + 2)
        .strokeColor(borderGray)
        .lineWidth(1)
        .stroke();

      // Notes and Summary Calculations
      const summaryTop = currentY + 15;

      // Notes Section on the left
      if (sale.notes) {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(textGray)
          .text('NOTES / REMARKS:', 40, summaryTop)
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(primaryColor)
          .text(sale.notes, 40, summaryTop + 14, { width: 220 });
      }

      // Totals Box on the right
      const summaryX = 330;
      const summaryWidth = doc.page.width - 40 - summaryX;

      doc
        .rect(summaryX - 10, summaryTop - 5, summaryWidth + 10, 85)
        .fill('#f8fafc')
        .strokeColor(borderGray)
        .lineWidth(0.5)
        .stroke();

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(textGray)
        .text('Subtotal:', summaryX, summaryTop + 4)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(`Rs. ${sale.subtotal.toFixed(2)}`, summaryX + 80, summaryTop + 4, { align: 'right', width: 130 });

      if (sale.discountPercentage > 0) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#dc2626') // red for discount
          .text(`Discount (${sale.discountPercentage}%):`, summaryX, summaryTop + 20)
          .font('Helvetica-Bold')
          .text(`-Rs. ${sale.discountAmount.toFixed(2)}`, summaryX + 80, summaryTop + 20, { align: 'right', width: 130 });
      } else {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(textGray)
          .text('Discount:', summaryX, summaryTop + 20)
          .font('Helvetica')
          .text('Rs. 0.00', summaryX + 80, summaryTop + 20, { align: 'right', width: 130 });
      }

      if (sale.taxAmount > 0) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(textGray)
          .text(`Tax (${sale.taxPercentage}%):`, summaryX, summaryTop + 36)
          .font('Helvetica-Bold')
          .fillColor(primaryColor)
          .text(`+Rs. ${sale.taxAmount.toFixed(2)}`, summaryX + 80, summaryTop + 36, { align: 'right', width: 130 });
      }

      // Total Grand Highlight
      doc
        .rect(summaryX - 10, summaryTop + 54, summaryWidth + 10, 26)
        .fill(primaryColor);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('GRAND TOTAL:', summaryX, summaryTop + 62)
        .text(`Rs. ${sale.grandTotal.toFixed(2)}`, summaryX + 80, summaryTop + 62, { align: 'right', width: 130 });

      if (sale.refundAmount && sale.refundAmount > 0) {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#16a34a')
          .text(`REFUND PAID: -Rs. ${sale.refundAmount.toFixed(2)}`, summaryX - 10, summaryTop + 85, { width: summaryWidth + 10, align: 'right' });
      }

    // Footer Terms & Conditions
    const footerY = 730;
    doc
      .moveTo(40, footerY)
      .lineTo(doc.page.width - 40, footerY)
      .strokeColor(borderGray)
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(primaryColor)
      .text('Terms & Conditions:', 40, footerY + 8)
      .font('Helvetica')
      .fillColor(textGray)
      .text('1. Goods once sold can be exchanged within 7 days against original bill.', 40, footerY + 20)
      .text('2. Warranty on power tools and electrical items as per manufacturer terms.', 40, footerY + 30)
      .text('Authorized Signature & Seal: __________________________', 330, footerY + 25, { align: 'right' })
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor(accentColor)
      .text(`Thank you for choosing ${shopName}! We value your business.`, 40, footerY + 50, { align: 'center', width: doc.page.width - 80 });

    return doc;
  }
}
