import strip from "../config/strip.config.js";

export const verifyStripeWebhook = (req, res, next) => {
  const signature = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return res.status(500).json({ message: "Stripe webhook secret is not configured" });
  }

  try {
    req.stripeEvent = strip.webhooks.constructEvent(req.body, signature, secret);
    return next();
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }
};
