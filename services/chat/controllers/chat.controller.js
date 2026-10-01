import mongoose from "mongoose";
import Conversation from "../models/conversation.modle.js";
import Message from "../models/message.model.js";

const userIdFor = (req, res) => {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || !userId.trim()) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  return userId;
};

const ownedConversation = async (req, res, id) => {
  const userId = userIdFor(req, res);
  if (!userId) return null;
  if (!mongoose.isObjectIdOrHexString(id)) {
    res.status(400).json({ message: "Invalid conversation ID" });
    return null;
  }
  const conversation = await Conversation.findOne({ _id: id, userId });
  if (!conversation)
    res.status(404).json({ message: "Conversation not found" });
  return conversation;
};

const serverError = (res, error) => {
  console.error("Chat service error:", error.message);
  return res.status(500).json({ message: "Chat service request failed" });
};

export const createConversation = async (req, res) => {
  try {
    const userId = userIdFor(req, res);
    if (!userId) return;
    return res.status(201).json(await Conversation.create({ userId }));
  } catch (error) {
    return serverError(res, error);
  }
};

export const getConversation = async (req, res) => {
  try {
    const userId = userIdFor(req, res);
    if (!userId) return;
    return res
      .status(200)
      .json(
        await Conversation.find({ userId }).sort({ updatedAt: -1, _id: -1 }),
      );
  } catch (error) {
    return serverError(res, error);
  }
};

export const getConversationById = async (req, res) => {
  try {
    const conversation = await ownedConversation(
      req,
      res,
      req.params.conversationId,
    );
    if (conversation) return res.status(200).json(conversation);
  } catch (error) {
    return serverError(res, error);
  }
};

export const updateConversation = async (req, res) => {
  try {
    const { id, title } = req.body || {};
    const conversation = await ownedConversation(req, res, id);
    if (!conversation) return;
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "A title is required" });
    }
    const updated = await Conversation.findOneAndUpdate(
      { _id: id, userId: req.headers["x-user-id"] },
      { title: title.trim().slice(0, 40) },
      { new: true, runValidators: true },
    );
    return res.status(200).json(updated);
  } catch (error) {
    return serverError(res, error);
  }
};

export const saveMessage = async (req, res) => {
  try {
    const { conversationId, role, content, images,artifacts } = req.body || {};
    const conversation = await ownedConversation(req, res, conversationId);
    if (!conversation) return;
    if (
      !["user", "assistant"].includes(role) ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res
        .status(400)
        .json({ message: "A valid role and nonempty content are required" });
    }
    const message = await Message.create({
      conversationId,
      role,
      content,
      images,
      artifacts
    });
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { updatedAt: new Date() } },
    );
    return res.status(201).json(message);
  } catch (error) {
    return serverError(res, error);
  }
};

export const getMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!(await ownedConversation(req, res, conversationId))) return;
    const messages = await Message.find({ conversationId }).sort({
      createdAt: 1,
      _id: 1,
    });
    return res.status(200).json(messages);
  } catch (error) {
    return serverError(res, error);
  }
};
