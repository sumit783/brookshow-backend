/**
 * Generates HTML template for ticket confirmation email
 * @param {Object} data - Ticket and Event data
 * @returns {string} - HTML string
 */
import {baseUrl} from "../config/config.js";
export const getTicketConfirmationTemplate = (data) => {
  const { 
    buyerName, 
    eventName, 
    eventDate, 
    eventTime, 
    venue, 
    ticketType, 
    quantity, 
    totalPrice, 
    qrDataUrl,
    ticketId
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .header { background-color: #6200ee; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .event-card { background-color: #f9f9f9; border-left: 4px solid #6200ee; padding: 15px; margin-bottom: 20px; }
        .ticket-details { border-collapse: collapse; width: 100%; margin: 20px 0; }
        .ticket-details td { padding: 10px 0; border-bottom: 1px solid #eee; }
        .qr-section { text-align: center; margin: 30px 0; }
        .qr-section img { max-width: 200px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
        .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777; }
        .button { display: inline-block; padding: 10px 20px; background-color: #6200ee; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${buyerName},</p>
          <p>Your ticket for <strong>${eventName}</strong> has been successfully booked. Please find your ticket details below:</p>
          
          <div class="event-card">
            <h3 style="margin-top: 0;">${eventName}</h3>
            <p style="margin-bottom: 0;">
              📅 ${eventDate}<br>
              ⏰ ${eventTime}<br>
              📍 ${venue}
            </p>
          </div>

          <table class="ticket-details">
            <tr>
              <td><strong>Ticket Type</strong></td>
              <td align="right">${ticketType}</td>
            </tr>
            <tr>
              <td><strong>Quantity</strong></td>
              <td align="right">${quantity} Person(s)</td>
            </tr>
            <tr>
              <td><strong>Total Paid</strong></td>
              <td align="right">₹${totalPrice}</td>
            </tr>
            <tr>
              <td><strong>Ticket ID</strong></td>
              <td align="right">${ticketId}</td>
            </tr>
          </table>

          <div class="qr-section">
            <p><strong>Scan this QR at the venue entry</strong></p>
            <img src="${qrDataUrl && (qrDataUrl.startsWith('data:') || qrDataUrl.startsWith('cid:')) ? qrDataUrl : baseUrl + (qrDataUrl || '')}" alt="Ticket QR Code" />
          </div>

          <p>We look forward to seeing you there!</p>
          <p>Best regards,<br>The BrookShow Team</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>© 2026 BrookShow. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
