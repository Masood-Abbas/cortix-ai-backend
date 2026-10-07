import axios from "axios";
import strip from "../config/strip.config.js";
import Payment from "../models/payment.model.js";
import { Plans } from "../utils/plan/Plans.js";

export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.headers["x-user-id"];
    const selectedPlan = Plans[plan];

    if (!selectedPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const session = await strip.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selectedPlan.name,
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan,
        credits: String(selectedPlan.credits),
      },
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });
    // Save payment/order in MongoDB
    const payment = await Payment.create({
      userId,
      orderId: session.id,
      amount: selectedPlan.amount,
      currency: "USD",
      credits: selectedPlan.credits,
      plan,
      status: "created",
    });

    return res.status(201).json({
      message: "Order created successfully",

      paymentId: payment._id,

      orderId: session.id,

      checkoutUrl: session.url,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

const applyPaidCheckoutSession = async (session) => {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const credits = Number(session.metadata?.credits);

    if (!userId || !plan || !credits) {
        return { status: 400, body: { message: "Invalid payment metadata" } };
    }

    const payment = await Payment.findOne({
        orderId: session.id,
    });

    if (!payment) {
        return { status: 404, body: { message: "Payment not found" } };
    }

    if (payment.status === "paid") {
        return {
            status: 200,
            body: {
                received: true,
                message: "Payment already processed",
            },
        };
    }

    await axios.post(
        `${process.env.USER_SERVICE_URL}/update-plan`,
        {
            userId,
            plan,
            credits,
        },
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );

    payment.status = "paid";
    payment.paymentId = session.payment_intent;

    await payment.save();

    return {
        status: 200,
        body: {
            received: true,
            message: "Payment processed",
        },
    };
};

export const stripeWebhook = async (req, res) => {
    try {
        const event = req.stripeEvent;
        console.log("Stripe webhook event:", event?.type);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            try {
                const result = await applyPaidCheckoutSession(session);
                return res.status(result.status).json(result.body);
            } catch (error) {
                console.error(
                    "Update plan API failed:",
                    error.response?.data || error.message
                );

                return res.status(500).json({
                    message: "Failed to update user payment",
                });
            }
        }

        return res.json({
            received: true,
        });

    } catch (error) {
        console.error("Stripe webhook error:", error);

        return res.status(500).json({
            message: `Webhook failed ${error}`,
        });
    }
};

export const confirmCheckoutSession = async (req, res) => {
    try {
        const { sessionId } = req.body || {};
        const userId = req.headers["x-user-id"];

        if (!sessionId) {
            return res.status(400).json({ message: "Checkout session ID is required" });
        }

        const session = await strip.checkout.sessions.retrieve(sessionId);

        if (session.metadata?.userId !== userId) {
            return res.status(403).json({ message: "Checkout session does not belong to this user" });
        }

        if (session.payment_status !== "paid") {
            return res.status(400).json({ message: "Payment is not complete" });
        }

        const result = await applyPaidCheckoutSession(session);
        return res.status(result.status).json(result.body);
    } catch (error) {
        console.error("Confirm checkout session failed:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to confirm payment" });
    }
};
