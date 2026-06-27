export interface OrderEmailData {
  orderCode: string
  merchantName: string
  recipientName: string
  deliveryAddress: string
}

function wrap(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1a1a2e; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 18px; }
    .body { padding: 28px 32px; color: #333; line-height: 1.6; }
    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; margin: 12px 0; }
    .footer { background: #f4f4f4; padding: 16px 32px; font-size: 12px; color: #888; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
    td:first-child { color: #666; width: 40%; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Delivery Management — ${title}</h1></div>
    <div class="body">${body}</div>
    <div class="footer">This is an automated message. Please do not reply.</div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------

export function orderApprovedTemplate(data: OrderEmailData) {
  return {
    subject: `Order ${data.orderCode} Approved — Pickup Scheduled`,
    html: wrap(
      "Order Approved",
      `<p>Hi <strong>${data.merchantName}</strong>,</p>
      <p>Your order has been <span class="status-badge" style="background:#d1fae5;color:#065f46;">✓ Approved</span> and a pickup rider has been assigned.</p>
      <table>
        <tr><td>Order Code</td><td><strong>${data.orderCode}</strong></td></tr>
        <tr><td>Recipient</td><td>${data.recipientName}</td></tr>
        <tr><td>Delivery Address</td><td>${data.deliveryAddress}</td></tr>
      </table>
      <p>The rider will collect the parcel from your pickup location shortly.</p>`,
    ),
  }
}

export function orderPickedUpTemplate(data: OrderEmailData) {
  return {
    subject: `Order ${data.orderCode} Picked Up`,
    html: wrap(
      "Order Picked Up",
      `<p>Hi <strong>${data.merchantName}</strong>,</p>
      <p>Your parcel has been <span class="status-badge" style="background:#dbeafe;color:#1e40af;">↑ Picked Up</span> by the rider and is on its way to the warehouse.</p>
      <table>
        <tr><td>Order Code</td><td><strong>${data.orderCode}</strong></td></tr>
        <tr><td>Recipient</td><td>${data.recipientName}</td></tr>
      </table>`,
    ),
  }
}

export function orderInWarehouseTemplate(data: OrderEmailData) {
  return {
    subject: `Order ${data.orderCode} Received at Warehouse`,
    html: wrap(
      "Order at Warehouse",
      `<p>Hi <strong>${data.merchantName}</strong>,</p>
      <p>Your parcel is now <span class="status-badge" style="background:#fef3c7;color:#92400e;">🏭 In Warehouse</span> and will be dispatched for delivery soon.</p>
      <table>
        <tr><td>Order Code</td><td><strong>${data.orderCode}</strong></td></tr>
        <tr><td>Recipient</td><td>${data.recipientName}</td></tr>
        <tr><td>Delivery Address</td><td>${data.deliveryAddress}</td></tr>
      </table>`,
    ),
  }
}

export function orderInTransitTemplate(data: OrderEmailData) {
  return {
    subject: `Order ${data.orderCode} Dispatched for Delivery`,
    html: wrap(
      "Order Dispatched",
      `<p>Hi <strong>${data.merchantName}</strong>,</p>
      <p>Your parcel has been <span class="status-badge" style="background:#ede9fe;color:#5b21b6;">🚚 Dispatched</span> and is heading to the delivery address.</p>
      <table>
        <tr><td>Order Code</td><td><strong>${data.orderCode}</strong></td></tr>
        <tr><td>Recipient</td><td>${data.recipientName}</td></tr>
        <tr><td>Delivery Address</td><td>${data.deliveryAddress}</td></tr>
      </table>`,
    ),
  }
}

export function orderDeliveredTemplate(data: OrderEmailData) {
  return {
    subject: `Order ${data.orderCode} Delivered ✓`,
    html: wrap(
      "Order Delivered",
      `<p>Hi <strong>${data.merchantName}</strong>,</p>
      <p>Great news! Your parcel has been <span class="status-badge" style="background:#d1fae5;color:#065f46;">✓ Delivered</span> successfully.</p>
      <table>
        <tr><td>Order Code</td><td><strong>${data.orderCode}</strong></td></tr>
        <tr><td>Recipient</td><td>${data.recipientName}</td></tr>
        <tr><td>Delivered To</td><td>${data.deliveryAddress}</td></tr>
      </table>
      <p>COD will be settled and reflected in your payout shortly.</p>`,
    ),
  }
}

export function orderFailedAttemptTemplate(
  data: OrderEmailData & { note: string },
) {
  return {
    subject: `Order ${data.orderCode} — Delivery Attempt Failed`,
    html: wrap(
      "Delivery Failed",
      `<p>Hi <strong>${data.merchantName}</strong>,</p>
      <p>Unfortunately, a delivery attempt for your parcel has <span class="status-badge" style="background:#fee2e2;color:#991b1b;">✗ Failed</span>.</p>
      <table>
        <tr><td>Order Code</td><td><strong>${data.orderCode}</strong></td></tr>
        <tr><td>Recipient</td><td>${data.recipientName}</td></tr>
        <tr><td>Failure Reason</td><td>${data.note}</td></tr>
      </table>
      <p>Our team will assess the situation and attempt redelivery or initiate a return.</p>`,
    ),
  }
}

export function orderReturnedTemplate(
  data: OrderEmailData & { reason: string },
) {
  return {
    subject: `Order ${data.orderCode} — Parcel Returned`,
    html: wrap(
      "Order Returned",
      `<p>Hi <strong>${data.merchantName}</strong>,</p>
      <p>Your parcel has been <span class="status-badge" style="background:#fee2e2;color:#991b1b;">↩ Returned</span> to the warehouse.</p>
      <table>
        <tr><td>Order Code</td><td><strong>${data.orderCode}</strong></td></tr>
        <tr><td>Recipient</td><td>${data.recipientName}</td></tr>
        <tr><td>Return Reason</td><td>${data.reason}</td></tr>
      </table>
      <p>Please contact support to arrange collection of the parcel.</p>`,
    ),
  }
}
