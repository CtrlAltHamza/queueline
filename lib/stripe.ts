import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_for_development";

export const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-11-20.acacia" as any,
  typescript: true,
});

export async function createDepositCheckoutSession({
  bookingId,
  businessName,
  serviceName,
  depositCents,
  currency = "usd",
  customerEmail,
  origin,
}: {
  bookingId: string;
  businessName: string;
  serviceName: string;
  depositCents: number;
  currency?: string;
  customerEmail: string;
  origin: string;
}) {
  // If no live Stripe key provided in demo/dev mode, simulate redirect url
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("placeholder")) {
    return {
      id: `cs_test_mock_${bookingId}`,
      url: `${origin}/api/stripe/webhook?mock_success=true&booking_id=${bookingId}&session_id=cs_test_mock_${bookingId}`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: `${businessName} - Appointment Deposit`,
            description: `Reservation deposit for ${serviceName}. Deducted from final service charge.`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      booking_id: bookingId,
    },
    success_url: `${origin}/b/glow-clinic/success?booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/b/glow-clinic?cancelled=true`,
  });

  return { id: session.id, url: session.url };
}
