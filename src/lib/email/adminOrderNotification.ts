import { Resend } from "resend";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import {
  SITE_CONFIG,
  PAYMENT_METHOD_LABELS,
  ORDER_STATUS_LABELS,
} from "@/lib/constants/site";
import type { Order } from "@/lib/types/order";

/**
 * Resolves list of admin email recipients.
 * Priority order:
 * 1. process.env.ADMIN_EMAILS (comma-separated list)
 * 2. process.env.ADMIN_EMAIL (single email fallback)
 * 3. Firestore query for users with role === 'admin'
 * 4. SITE_CONFIG.contact.email
 */
export async function getAdminRecipients(): Promise<string[]> {
  const emails = new Set<string>();
  const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

  const addRecipient = (value: unknown, source: string) => {
    if (typeof value !== "string") return;

    let recipient = value.trim();
    if (
      (recipient.startsWith('"') && recipient.endsWith('"')) ||
      (recipient.startsWith("[") && recipient.endsWith("]"))
    ) {
      recipient = recipient.slice(1, -1).trim();
    }

    const normalized = recipient.toLowerCase();
    if (!normalized || !emailPattern.test(normalized)) {
      if (recipient) {
        console.warn(
          `[AdminOrderNotification] Invalid admin email recipient from ${source}: ${recipient}`
        );
      }
      return;
    }

    emails.add(normalized);
  };

  if (process.env.ADMIN_EMAILS) {
    process.env.ADMIN_EMAILS.split(",").forEach((email) => addRecipient(email, "ADMIN_EMAILS"));
  }

  if (process.env.ADMIN_EMAIL) {
    addRecipient(process.env.ADMIN_EMAIL, "ADMIN_EMAIL");
  }

  // Fallback to Firestore admin query if no env variable is defined
  if (emails.size === 0) {
    try {
      const adminUsersSnap = await adminDb
        .collection(COLLECTIONS.USERS)
        .where("role", "==", "admin")
        .where("isActive", "==", true)
        .limit(10)
        .get();

      adminUsersSnap.docs.forEach((docSnap) => {
        const uEmail = docSnap.data()?.email;
        addRecipient(uEmail, `Firestore user ${docSnap.id}`);
      });
    } catch (err) {
      console.warn("[AdminOrderNotification] Could not query admin users from Firestore:", err);
    }
  }

  // Final fallback to site contact email
  if (emails.size === 0 && SITE_CONFIG.contact.email) {
    addRecipient(SITE_CONFIG.contact.email, "SITE_CONFIG.contact.email");
  }

  return Array.from(emails);
}

function escapeHtml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(amount: number | undefined | null): string {
  const num = typeof amount === "number" ? amount : 0;
  return `Rs. ${num.toLocaleString("en-NP")}`;
}

function formatOrderDate(createdAt: unknown): string {
  if (!createdAt) return "Just now";

  let date: Date;
  if (createdAt instanceof Date) {
    date = createdAt;
  } else if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "toDate" in createdAt &&
    typeof createdAt.toDate === "function"
  ) {
    date = createdAt.toDate();
  } else if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "seconds" in createdAt &&
    typeof createdAt.seconds === "number"
  ) {
    date = new Date(createdAt.seconds * 1000);
  } else {
    date = new Date(createdAt as string | number);
  }

  if (Number.isNaN(date.getTime())) return "Just now";

  return `${date.toLocaleString("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} NPT`;
}

/**
 * Generates email-safe, responsive HTML email for admin order notifications.
 */
export function generateAdminOrderEmailHtml(order: Order, adminOrderUrl: string): string {
  const orderNumber = order.orderNumber || order.id;
  const paymentMethodLabel =
    PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod?.toUpperCase() || "N/A";
  const orderStatusLabel =
    ORDER_STATUS_LABELS[order.status] || order.status?.toUpperCase() || "Pending";

  const paymentBadgeColor =
    order.paymentStatus === "paid"
      ? "background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;"
      : "background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a;";
  const paymentStatusText = order.paymentStatus === "paid" ? "PAID" : "PENDING (COD)";

  const dateStr = formatOrderDate(order.createdAt);

  const address = order.shippingAddress;
  const fullAddress = address
    ? [
        address.streetAddress,
        address.ward ? `Ward ${address.ward}` : undefined,
        address.municipality,
        address.district,
        address.province,
      ]
        .filter(Boolean)
        .join(", ")
    : "Not provided";

  const itemsRows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; vertical-align: top;">
          <strong style="color: #0f172a;">${escapeHtml(item.productName)}</strong>
          ${
            item.variant
              ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">Variant: ${escapeHtml(
                  Object.entries(item.variant)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")
                )}</div>`
              : ""
          }
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; text-align: center; vertical-align: top;">
          ${escapeHtml(item.quantity)}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; text-align: right; vertical-align: top; white-space: nowrap;">
          ${formatPrice(item.price)}
        </td>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right; vertical-align: top; white-space: nowrap;">
          ${formatPrice(item.subtotal)}
        </td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Order Received - NexShop</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.5; color: #334155;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container (600px) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: center; border-bottom: 3px solid #2563eb;">
              <div style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0;">
                NexShop
              </div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
                ${escapeHtml(SITE_CONFIG.tagline)}
              </div>
            </td>
          </tr>

          <!-- Notification Alert Bar -->
          <tr>
            <td style="background-color: #eff6ff; padding: 16px 32px; border-bottom: 1px solid #dbeafe;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e40af;">
                      🛒 New Order Received
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #3b82f6;">
                      Order <strong>#${escapeHtml(orderNumber)}</strong> has been placed and confirmed in the system.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 32px;">
              
              <!-- Key Order Metadata Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 18px; width: 50%; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px;">Order ID</div>
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">#${escapeHtml(orderNumber)}</div>
                  </td>
                  <td style="padding: 14px 18px; width: 50%; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px;">Date &amp; Time</div>
                    <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">${escapeHtml(dateStr)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; width: 50%; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px;">Payment Method</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px;">
                      ${escapeHtml(paymentMethodLabel)}
                    </div>
                  </td>
                  <td style="padding: 14px 18px; width: 50%;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px;">Payment Status</div>
                    <div style="margin-top: 4px;">
                      <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; ${paymentBadgeColor}">
                        ${escapeHtml(paymentStatusText)}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Customer & Shipping Information Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; height: 100%;">
                      <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        👤 Customer Details
                      </div>
                      <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(order.userName || "Customer")}</div>
                      ${
                        order.userEmail
                          ? `<div style="font-size: 13px; color: #475569; margin-top: 3px;">
                              <a href="mailto:${escapeHtml(order.userEmail)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(order.userEmail)}</a>
                            </div>`
                          : `<div style="font-size: 13px; color: #64748b; margin-top: 3px;">Direct Buyer (No email)</div>`
                      }
                      ${
                        address?.phone
                          ? `<div style="font-size: 13px; color: #475569; margin-top: 3px;">📞 ${escapeHtml(address.phone)}</div>`
                          : ""
                      }
                    </div>
                  </td>
                  <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; height: 100%;">
                      <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        📍 Delivery Address
                      </div>
                      <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${escapeHtml(address?.fullName || order.userName)}</div>
                      <div style="font-size: 13px; color: #475569; margin-top: 3px; line-height: 1.4;">
                        ${escapeHtml(fullAddress)}
                      </div>
                      ${
                        address?.landmark
                          ? `<div style="font-size: 12px; color: #64748b; margin-top: 3px;">Landmark: ${escapeHtml(address.landmark)}</div>`
                          : ""
                      }
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Order Items Table -->
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                📦 Order Items (${(order.items || []).length})
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; border-collapse: separate; border-spacing: 0;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0;">Item</th>
                    <th style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748b; text-align: center; border-bottom: 1px solid #e2e8f0;">Qty</th>
                    <th style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748b; text-align: right; border-bottom: 1px solid #e2e8f0;">Price</th>
                    <th style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #64748b; text-align: right; border-bottom: 1px solid #e2e8f0;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>

              <!-- Order Financial Totals Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="width: 55%;"></td>
                  <td style="width: 45%;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #475569;">
                      <tr>
                        <td style="padding: 4px 0; color: #64748b;">Items Subtotal:</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">${formatPrice(order.subtotal)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b;">Shipping Charge:</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #1e293b;">
                          ${order.shippingCharge === 0 ? '<span style="color: #16a34a;">FREE</span>' : formatPrice(order.shippingCharge)}
                        </td>
                      </tr>
                      ${
                        order.discount && order.discount > 0
                          ? `
                      <tr>
                        <td style="padding: 4px 0; color: #16a34a;">Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}:</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">-${formatPrice(order.discount)}</td>
                      </tr>`
                          : ""
                      }
                      <tr>
                        <td style="padding: 10px 0 4px 0; border-top: 2px solid #e2e8f0; font-size: 15px; font-weight: 700; color: #0f172a;">Grand Total:</td>
                        <td style="padding: 10px 0 4px 0; border-top: 2px solid #e2e8f0; text-align: right; font-size: 17px; font-weight: 800; color: #2563eb;">${formatPrice(order.total)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(adminOrderUrl)}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="12%" stroke="f" fillcolor="#2563eb">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">View Order in Admin Dashboard &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${escapeHtml(adminOrderUrl)}" target="_blank" rel="noopener noreferrer" style="background-color: #2563eb; color: #ffffff; display: inline-block; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 700; text-decoration: none; text-align: center; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                      View Order in Admin Dashboard &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 6px;">
                    <span style="font-size: 11px; color: #94a3b8;">
                      Direct link: <a href="${escapeHtml(adminOrderUrl)}" style="color: #64748b; text-decoration: underline;">${escapeHtml(adminOrderUrl)}</a>
                    </span>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                This is an automated operational notification sent to NexShop administrators.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(SITE_CONFIG.name)}. All rights reserved. &bull; <a href="${escapeHtml(SITE_CONFIG.url)}" style="color: #64748b; text-decoration: none;">${escapeHtml(SITE_CONFIG.url)}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export interface SendAdminOrderNotificationResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  resendId?: string;
  error?: string;
}

/**
 * Server-side entrypoint for sending an admin order notification email.
 *
 * Implements a strict, race-safe atomic claim via Firestore transaction:
 * - Reads order and checks adminNotificationStatus
 * - If "sent": aborts immediately (no duplicate email)
 * - If "sending" within the last 60 seconds: aborts (in-flight by another thread)
 * - Otherwise: marks status="sending", updates claim timestamp and attempts count
 *
 * After claiming:
 * - Resolves admin recipients
 * - Dispatches transactional email via Resend
 * - On success: updates status="sent", stores Resend message ID
 * - On failure: updates status="failed", stores error message
 *   * Preserves state to allow a safe retry without creating duplicates
 *   * NEVER throws or fails the customer's order or checkout flow
 */
export async function sendAdminOrderNotification(
  orderId: string
): Promise<SendAdminOrderNotificationResult> {
  if (!orderId) {
    return { success: false, reason: "missing_order_id" };
  }

  const orderRef = adminDb.collection(COLLECTIONS.ORDERS).doc(orderId);

  // 1. ATOMIC TRANSACTION: Claim the order
  let claimResult: {
    shouldSend: boolean;
    reason?: string;
    order?: Order & {
      adminNotificationStatus?: "pending" | "sending" | "sent" | "failed";
      adminNotificationClaimedAt?: { toMillis?: () => number };
    };
  };

  try {
    claimResult = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(orderRef);
      if (!snap.exists) {
        return { shouldSend: false, reason: "order_not_found" };
      }

      const data = snap.data() as Order & {
        adminNotificationStatus?: "pending" | "sending" | "sent" | "failed";
        adminNotificationClaimedAt?: { toMillis?: () => number };
      };

      // If already sent, do NOT send again (Duplicate Protection)
      if (data.adminNotificationStatus === "sent") {
        return { shouldSend: false, reason: "already_sent" };
      }

      // If currently sending, check if the claim is still fresh (< 60s)
      if (data.adminNotificationStatus === "sending") {
        const claimedAtMs = data.adminNotificationClaimedAt?.toMillis?.() || 0;
        const nowMs = Date.now();
        if (claimedAtMs > 0 && nowMs - claimedAtMs < 60000) {
          // Another concurrent request/thread is actively sending
          return { shouldSend: false, reason: "already_claimed_in_flight" };
        }
        // If claimed > 60s ago, the previous process timed out or crashed; allow reclaiming for retry
      }

      // Claim the order notification atomically
      transaction.update(orderRef, {
        adminNotificationStatus: "sending",
        adminNotificationClaimedAt: FieldValue.serverTimestamp(),
        adminNotificationAttempts: FieldValue.increment(1),
      });

      return {
        shouldSend: true,
        order: { ...data, id: snap.id },
      };
    });
  } catch (txErr) {
    console.error(`[AdminOrderNotification] Transaction error while claiming order ${orderId}:`, txErr);
    return {
      success: false,
      error: txErr instanceof Error ? txErr.message : String(txErr),
    };
  }

  if (!claimResult.shouldSend || !claimResult.order) {
    console.log(
      `[AdminOrderNotification] Order ${orderId} notification skipped: ${claimResult.reason}`
    );
    return { success: true, skipped: true, reason: claimResult.reason };
  }

  const order = claimResult.order;

  // 2. DISPATCH VIA RESEND (Outside transaction to avoid holding DB lock)
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      const errMsg = "RESEND_API_KEY environment variable is not configured";
      console.warn(`[AdminOrderNotification] ${errMsg}. Marking as failed for retry.`);
      await orderRef.update({
        adminNotificationStatus: "failed",
        adminNotificationFailedAt: FieldValue.serverTimestamp(),
        adminNotificationLastError: errMsg,
      });
      return { success: false, reason: "missing_api_key", error: errMsg };
    }

    const recipients = await getAdminRecipients();
    if (recipients.length === 0) {
      const errMsg = "No admin email recipients configured";
      console.warn(`[AdminOrderNotification] ${errMsg}. Marking as failed for retry.`);
      await orderRef.update({
        adminNotificationStatus: "failed",
        adminNotificationFailedAt: FieldValue.serverTimestamp(),
        adminNotificationLastError: errMsg,
      });
      return { success: false, reason: "no_recipients", error: errMsg };
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "https://www.nexshoponline.com.np"
    ).replace(/\/+$/, "");
    const adminOrderUrl = `${appUrl}/admin/orders/${order.id}`;

    const htmlContent = generateAdminOrderEmailHtml(order, adminOrderUrl);
    const fromEmail = process.env.EMAIL_FROM || "NexShop Orders <orders@nexshoponline.com.np>";
    const subject = `🛒 New Order Received — NexShop — #${order.orderNumber || order.id}`;

    const resend = new Resend(resendApiKey);

    const response = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html: htmlContent,
    });

    if (response.error) {
      throw new Error(response.error.message || "Unknown error from Resend API");
    }

    const resendId = response.data?.id;

    // 3. ATOMIC SUCCESS MARK: update to "sent"
    await orderRef.update({
      adminNotificationStatus: "sent",
      adminNotificationSentAt: FieldValue.serverTimestamp(),
      adminNotificationResendId: resendId || null,
      adminNotificationRecipients: recipients,
      adminNotificationLastError: FieldValue.delete(),
    });

    console.log(
      `[AdminOrderNotification] Notification successfully sent for order #${order.orderNumber || order.id} to ${recipients.join(
        ", "
      )} (Resend ID: ${resendId})`
    );

    return {
      success: true,
      resendId,
    };
  } catch (sendErr: unknown) {
    const errorMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
    console.error(
      `[AdminOrderNotification] Failed sending email for order ${order.id}:`,
      errorMsg
    );

    // Record failure in Firestore so a retry is permitted without duplicating
    try {
      await orderRef.update({
        adminNotificationStatus: "failed",
        adminNotificationFailedAt: FieldValue.serverTimestamp(),
        adminNotificationLastError: errorMsg,
      });
    } catch (dbUpdateErr) {
      console.error(
        `[AdminOrderNotification] Failed to record failure state on order ${order.id}:`,
        dbUpdateErr
      );
    }

    // Return failure result gracefully — DO NOT throw so order/payment is NEVER rolled back
    return {
      success: false,
      error: errorMsg,
    };
  }
}
