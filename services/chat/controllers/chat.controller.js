import Conversation from "../models/conversation.modle.js";
import Message from "../models/message.model.js";

// create conversation
export const createConversation = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    console.log("userId", userId);

    const converstion = await Conversation.create({
      userId: userId,
    });

    return res.status(200).json(converstion);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: `conversation server error ${error}`,
    });
  }
};

// get conversation
export const getConversation = async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    console.log("userId", userId);

    const converstion = await Conversation.find({
      userId: userId,
    }).sort({updatedAt: -1});

    return res.status(200).json(converstion);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: `get conversation server error ${error}`,
    });
  }
};

// update converstion
export const updateConversation = async (req, res) => {
  try {
    const {id,title}=req.body

    const converstion = await Conversation.findByIdAndUpdate(id,{
        title
    },{
        new:true
    });

    return res.status(200).json(converstion);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: `update conversation  error ${error}`,
    });
  }
};

// create message
export const saveMessage = async (req,res) => {
    try {
        const {conversationId,role,content}=req.body
        const message=await Message.create({
            conversationId,
            content,
            role
        })
        return res.status(200).json(message)
    } catch (error) {
        console.log(error)
        return res.status(500).json({
      message: `create message server error ${error}`,
    });
    }
}

// get message
export const getMessage = async (req,res) => {
    try {
        const conversationId=req.params.conversationId

        const messages=await Message.find({
            conversationId
        }).sort({createdAt: -1})
        return res.status(200).json(messages)
    } catch (error) {
        console.log(error)
        return res.status(500).json({
      message: `get message server error ${error}`,
    });
    }
}