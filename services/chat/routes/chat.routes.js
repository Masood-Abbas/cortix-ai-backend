import express from "express"
import { createConversation, getConversation, getConversationById, getMessage, saveMessage, updateConversation } from "../controllers/chat.controller.js"

const router= express.Router()

router.post("/create-conversation",createConversation)
router.get("/conversation/:conversationId",getConversationById)
router.get("/get-conversation",getConversation)
router.post("/update-conversation",updateConversation)


router.post("/save-messge",saveMessage)
router.get("/get-messge/:conversationId",getMessage)

export default router
