import PDFDocument from "pdfkit";
import QRCode from "qrcode";

/**
 * Generate a multi-ticket printable PDF stream
 * Arranges up to 5 tickets per A4 page to maximize space utilization.
 *
 * @param {Array} tickets - Array of ticket objects
 * @param {Object} [options] - Optional layout and branding config
 * @returns {Promise<PDFKit.PDFDocument>} - The PDFKit document stream
 */
export const generateTicketsPdfStream = async (tickets = [], options = {}) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 28,
    autoFirstPage: true,
    info: {
      Title: "BrookShow Offline Tickets Export",
      Author: "BrookShow Event Platform",
      Subject: "Offline Passes & Gate Stubs",
      CreationDate: new Date(),
    },
  });

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_X = 28;
  const MARGIN_Y = 28;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_X * 2; // 539.28 pt
  const TICKET_HEIGHT = 144;
  const TICKET_GAP = 10;
  const STUB_WIDTH = 138;

  let currentY = MARGIN_Y;
  let pageNumber = 1;

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];

    // If next ticket exceeds printable page height, start a fresh page
    if (currentY + TICKET_HEIGHT > PAGE_HEIGHT - MARGIN_Y) {
      doc.addPage();
      currentY = MARGIN_Y;
      pageNumber++;
    }

    const cardX = MARGIN_X;
    const cardY = currentY;
    const dividerX = cardX + USABLE_WIDTH - STUB_WIDTH;

    // 1. Ticket Outer Card (Rounded border & crisp white background)
    doc.save();
    doc.roundedRect(cardX, cardY, USABLE_WIDTH, TICKET_HEIGHT, 6)
       .fillAndStroke("#ffffff", "#cbd5e1");
    doc.restore();

    // 2. Header Accent Strip (Dark slate with branding and tier)
    doc.save();
    doc.rect(cardX, cardY + 4, USABLE_WIDTH, 18).fill("#1e293b");
    doc.roundedRect(cardX, cardY, USABLE_WIDTH, 20, 6).fill("#1e293b");
    doc.restore();

    // Header Text (Left: Platform, Right: Ticket Type)
    doc.fillColor("#ffffff").fontSize(7.5).font("Helvetica-Bold")
       .text("BROOKSHOW OFFICIAL PASS", cardX + 12, cardY + 6, { width: 220, ellipsis: true });

    const tierName = (t.ticketTypeName || "GENERAL ADMISSION").toUpperCase();
    doc.fillColor("#38bdf8").fontSize(8).font("Helvetica-Bold")
       .text(tierName, cardX + 240, cardY + 6, {
         width: dividerX - (cardX + 240) - 10,
         align: "right",
         ellipsis: true,
       });

    // 3. Main Body Section (Left)
    const contentX = cardX + 12;
    const mainWidth = dividerX - contentX - 10;

    // Event Title
    doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold")
       .text(t.eventTitle || "Event", contentX, cardY + 27, { width: mainWidth, ellipsis: true });

    // Date & Time
    let dateStr = "Date TBA";
    let timeStr = "";
    if (t.eventDate) {
      try {
        const d = new Date(t.eventDate);
        dateStr = d.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        timeStr = d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (e) {
        dateStr = String(t.eventDate);
      }
    }

    doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold").text("DATE: ", contentX, cardY + 43, { continued: true });
    doc.fillColor("#1e293b").fontSize(8).font("Helvetica").text(dateStr, { continued: true });
    if (timeStr) {
      doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold").text("   TIME: ", { continued: true });
      doc.fillColor("#1e293b").fontSize(8).font("Helvetica").text(timeStr);
    } else {
      doc.text("");
    }

    // Venue
    doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold").text("VENUE: ", contentX, cardY + 56, { continued: true });
    doc.fillColor("#1e293b").fontSize(7.5).font("Helvetica").text(t.eventVenue || "Venue details on ticket", {
      width: mainWidth,
      ellipsis: true,
    });

    // Horizontal Divider
    doc.save()
       .strokeColor("#e2e8f0")
       .lineWidth(0.8)
       .moveTo(contentX, cardY + 72)
       .lineTo(dividerX - 10, cardY + 72)
       .stroke()
       .restore();

    // Bottom 3-Column Info
    const colY = cardY + 77;

    // Col 1: Attendee Name & Phone
    doc.fillColor("#64748b").fontSize(6).font("Helvetica-Bold").text("ATTENDEE", contentX, colY);
    doc.fillColor("#0f172a").fontSize(8.5).font("Helvetica-Bold")
       .text(t.buyerName || "Guest", contentX, colY + 9, { width: 130, ellipsis: true });
    if (t.buyerPhone) {
      doc.fillColor("#475569").fontSize(7).font("Helvetica")
         .text(t.buyerPhone, contentX, colY + 21, { width: 130, ellipsis: true });
    }

    // Col 2: Serial & Persons Allowed
    const col2X = contentX + 135;
    doc.fillColor("#64748b").fontSize(6).font("Helvetica-Bold").text("TICKET SERIAL", col2X, colY);
    doc.fillColor("#4f46e5").fontSize(8).font("Courier-Bold")
       .text(t.ticketNumber || t.ticketId, col2X, colY + 9);
    doc.fillColor("#059669").fontSize(7).font("Helvetica-Bold")
       .text(`Admit: ${t.persons || 1} Person(s)`, col2X, colY + 21);

    // Col 3: Price & Security Status
    const col3X = contentX + 265;
    doc.fillColor("#64748b").fontSize(6).font("Helvetica-Bold").text("PRICE", col3X, colY);
    const priceVal = Number(t.ticketPrice || 0);
    doc.fillColor("#16a34a").fontSize(10.5).font("Helvetica-Bold")
       .text(priceVal > 0 ? `Rs. ${priceVal.toLocaleString("en-IN")}` : "FREE PASS", col3X, colY + 9);
    doc.fillColor("#047857").fontSize(6.5).font("Helvetica-Bold")
       .text("SECURE OFFLINE PASS", col3X, colY + 21);

    // 4. Perforated Tear-off Line
    doc.save()
       .strokeColor("#94a3b8")
       .lineWidth(1)
       .dash(3, { space: 3 })
       .moveTo(dividerX, cardY)
       .lineTo(dividerX, cardY + TICKET_HEIGHT)
       .stroke()
       .restore();

    // Half-circle punch notches on top and bottom
    doc.save();
    doc.circle(dividerX, cardY, 4.5).fill("#ffffff");
    doc.circle(dividerX, cardY, 4.5).stroke("#cbd5e1");
    doc.circle(dividerX, cardY + TICKET_HEIGHT, 4.5).fill("#ffffff");
    doc.circle(dividerX, cardY + TICKET_HEIGHT, 4.5).stroke("#cbd5e1");
    doc.restore();

    // 5. Tear-off Stub (Right Side)
    const stubX = dividerX;
    const stubW = STUB_WIDTH;

    // Stub background shading
    doc.save();
    doc.rect(stubX + 1, cardY + 1, stubW - 2, TICKET_HEIGHT - 2).fill("#f8fafc");
    doc.restore();

    // Stub Top Label
    doc.fillColor("#475569").fontSize(6).font("Helvetica-Bold")
       .text("GATE ENTRY STUB", stubX, cardY + 7, { width: stubW, align: "center" });

    // QR Code
    try {
      const qrPayloadStr = typeof t.qrPayload === "object"
        ? JSON.stringify(t.qrPayload)
        : (t.qrPayload || t.ticketNumber || t.ticketId);

      const qrBuf = await QRCode.toBuffer(qrPayloadStr, {
        width: 250,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      const qrSize = 74;
      const qrX = stubX + (stubW - qrSize) / 2;
      const qrY = cardY + 18;
      doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });
    } catch (qrErr) {
      console.error("QR Buffer Error for ticket", t.ticketNumber, qrErr);
    }

    // Stub Bottom Info
    doc.fillColor("#0f172a").fontSize(7).font("Courier-Bold")
       .text(t.ticketNumber || t.ticketId, stubX, cardY + 96, { width: stubW, align: "center" });
    doc.fillColor("#4f46e5").fontSize(6.5).font("Helvetica-Bold")
       .text("SCAN AT GATE", stubX, cardY + 107, { width: stubW, align: "center" });
    doc.fillColor("#64748b").fontSize(5.5).font("Helvetica")
       .text(t.buyerName ? t.buyerName.slice(0, 20) : "Admit One", stubX, cardY + 117, { width: stubW, align: "center" });

    // 6. Between-ticket cut guide line (if not last item on the page)
    const nextY = currentY + TICKET_HEIGHT + TICKET_GAP;
    if (i < tickets.length - 1 && nextY + TICKET_HEIGHT <= PAGE_HEIGHT - MARGIN_Y) {
      const cutY = cardY + TICKET_HEIGHT + TICKET_GAP / 2;
      doc.save()
         .strokeColor("#e2e8f0")
         .lineWidth(0.5)
         .dash(4, { space: 4 })
         .moveTo(cardX + 25, cutY)
         .lineTo(cardX + USABLE_WIDTH - 25, cutY)
         .stroke()
         .restore();
    }

    currentY += TICKET_HEIGHT + TICKET_GAP;
  }

  doc.end();
  return doc;
};
