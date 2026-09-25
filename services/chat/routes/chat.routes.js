import express from "express"
import { createConversation, getConversation, getMessage, saveMessage, updateConversation } from "../controllers/chat.controller.js"

const router= express.Router()

router.get("/create-conversation",createConversation)
router.get("/get-conversation",getConversation)
router.post("/update-conversation",updateConversation)


router.post("save-messge",saveMessage)
router.get("get-messge/:conversationId",getMessage)

export default router