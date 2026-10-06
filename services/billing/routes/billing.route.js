import express from "express"
import { createOrder, stripeWebhook } from "../controllers/billing.controller.js"

const router =express.Router()

router.post("/create",createOrder)
router.post("/stripeWebhook",stripeWebhook)

export default router