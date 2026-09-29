import axios from "axios"
import { graph } from "../graph/graph.js"

export const agent=async (req,res) => {
    try {
        const {prompt,conversationId}=req.body
        await axios.post(`${process.env.CHAT_SERVICE}/save-messge`,{
            conversationId,
            content:prompt,
            role:"user"
        })
        const result = await graph.invoke({
            prompt,conversationId
        })
       const response= result.aiResponse
       return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        return res.staus(500).json({
            message:`agent error ${error}`
        })
    }
}