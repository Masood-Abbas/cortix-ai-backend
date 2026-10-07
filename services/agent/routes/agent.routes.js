import express from "express"
import { agent } from "../controllers/agent.controller.js"
import multer from "../middleware/multer.js"

const router =express.Router()

router.post("/chat",multer.single("file"),agent  )

export default router
