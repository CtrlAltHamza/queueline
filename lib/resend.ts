import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "re_placeholder_development_key";
export const resend = new Resend(resendApiKey);

export async function sendBookingConfirmationEmail({
  to,
  customerName,
  businessName,
  serviceName,
  startsAt,
  depositCents,
  bookingId,
}: {
  to: string;
  customerName: string;
  businessName: string;
  serviceName: string;
  startsAt: string;
  depositCents: number;
  bookingId: string;
}) {
  const formattedDate = new Date(startsAt).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const formattedDeposit = (depositCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  try {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.includes("placeholder")) {
      console.log(`[Resend Mock Email Dispatch] To: ${to} | Booking #${bookingId} confirmed at ${businessName}`);
      return { success: true, mock: true };
    }

    const { data, error } = await resend.emails.send({
      from: "QueueLine Bookings <onboarding@resend.dev>",
      to: [to],
      subject: `Booking Confirmed: ${serviceName} at ${businessName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">Booking Confirmed!</h2>
          <p style="color: #374151; font-size: 16px;">Hello <strong>${customerName}</strong>,</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            Your reservation at <strong>${businessName}</strong> has been successfully confirmed.
          </p>
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 6px 0; color: #4b5563;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 6px 0; color: #4b5563;"><strong>Time:</strong> ${formattedDate}</p>
            <p style="margin: 6px 0; color: #4b5563;"><strong>Deposit Paid:</strong> ${formattedDeposit}</p>
            <p style="margin: 6px 0; color: #4b5563;"><strong>Booking Ref:</strong> <code style="background: #e0e7ff; padding: 2px 6px; border-radius: 4px; color: #3730a3;">${bookingId.slice(0, 8)}</code></p>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            Need to reschedule or cancel? You can manage your appointments anytime via your customer dashboard.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">Powered by QueueLine Booking Engine</p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend Error]", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    // Ticket T7: an email failure must never break the booking
    console.error("[Resend Fatal Exception Caught]", err);
    return { success: false, error: err };
  }
}
