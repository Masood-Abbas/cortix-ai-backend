import express from "express"
import { deductCredits, getCurrentUser, loginController,logoutController, updateUserPayment } from "../controllers/auth.controller.js"



const router= express.Router()

router.post("/login",loginController)
router.get("/logout",logoutController)
router.post("/update-plan",updateUserPayment)
router.get("/me",getCurrentUser)
router.post("/deduct-credits",deductCredits)

export default router
