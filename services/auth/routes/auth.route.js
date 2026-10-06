import express from "express"
import { loginController,logoutController, updateUserPayment } from "../controllers/auth.controller.js"



const router= express.Router()

router.post("/login",loginController)
router.get("/logout",logoutController)
router.post("/update-plan",updateUserPayment)

export default router
