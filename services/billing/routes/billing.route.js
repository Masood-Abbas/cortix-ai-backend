import express from "express"
import { confirmCheckoutSession, createOrder, stripeWebhook } from "../controllers/billing.controller.js"
import { verifyStripeWebhook } from "../middleware/stripeWebhook.middleware.js"

const router =express.Router()

router.post("/create",createOrder)
router.post("/confirm",confirmCheckoutSession)
router.post("/stripeWebhook", express.raw({ type: "application/json" }), verifyStripeWebhook, stripeWebhook)

export default router
