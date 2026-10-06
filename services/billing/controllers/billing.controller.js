import strip from "../config/strip.config.js";
import Payment from "../models/payment.model.js";
import { Plans } from "../utils/plan/Plans.js";

export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.header["x-user-id"];
    const selectedPlan = Plans[plan];

    if (!selectedPlan) {
      return req.status(404).json({ message: "Plan not found" });
    }

    const session = await strip.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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


export const stripeWebhook = async (req, res) => {
    try {
        const event = req.stripeEvent;

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            const userId = session.metadata?.userId;
            const plan = session.metadata?.plan;
            const credits = Number(session.metadata?.credits);

            if (!userId || !plan || !credits) {
                return res.status(400).json({
                    message: "Invalid payment metadata",
                });
            }

            const payment = await Payment.findOne({
                orderId: session.id,
            });

            if (!payment) {
                return res.status(404).json({
                    message: "Payment not found",
                });
            }

            // Prevent duplicate webhook processing
            if (payment.status === "paid") {
                return res.json({
                    received: true,
                    message: "Payment already processed",
                });
            }

            // Call your update-plan API
            const response = await fetch(
                `${process.env.USER_SERVICE_URL} /update-plan`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        userId,
                        plan,
                        credits,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.text();

                console.error(
                    "Update plan API failed:",
                    errorData
                );

                return res.status(500).json({
                    message: "Failed to update user payment",
                });
            }

            payment.status = "paid";
            payment.paymentId = session.payment_intent;

            await payment.save();
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