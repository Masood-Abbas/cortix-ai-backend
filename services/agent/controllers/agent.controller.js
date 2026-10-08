import axios from "axios";
import mongoose from "mongoose";
import { graph } from "../graph/graph.js";
import { getMemory, invalidateMemory } from "../utils/memory.js";
import fs from "fs";
import { uploadTOS3 } from "../utils/uplodeToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";

export const agent = async (req, res, next) => {
  try {
    const { prompt, conversationId, agent } = req.body || {};
    const file = req.file;
    const promptText = typeof prompt === "string" ? prompt.trim() : "";
    const userId = req.headers["x-user-id"];
    if (typeof userId !== "string" || !userId.trim()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (
      !mongoose.isObjectIdOrHexString(conversationId) ||
      (!promptText && !file)
    ) {
      return res.status(400).json({
        message: "A conversation ID and a prompt or file are required",
      });
    }
    const messageContent = promptText || `Uploaded file: ${file.originalname}`;
    let userFiles = [];
    if (file?.path) {
      const fileName = `uploads/${Date.now()}-${file.originalname}`;
      await uploadTOS3(fileName, fs.readFileSync(file.path), file.mimetype);
      userFiles = [
        {
          name: file.originalname,
          url: await getFromS3(fileName, 24 * 60 * 60),
          type: file.mimetype,
        },
      ];
    }
    const options = { headers: { "x-user-id": userId }, timeout: 15000 };
    // Check ownership even on a cache hit, before invoking a paid model.
    await axios.get(
      `${process.env.CHAT_SERVICE}/conversation/${conversationId}`,
      options,
    );
    // Snapshot history BEFORE saving this turn so the current prompt appears once.
    const history = await getMemory(conversationId, userId);
    await axios.post(
      `${process.env.CHAT_SERVICE}/save-messge`,
      {
        conversationId,
        content: messageContent,
        role: "user",
        files: userFiles,
      },
      options,
    );
    await invalidateMemory(conversationId, userId);
    const result = await graph.invoke({
      prompt: messageContent,
      conversationId,
      history,
      agent,
      userId,
      file,
      cookie: req.headers.cookie,
    });
    const response = result.aiResponse;
    if (typeof response !== "string" || !response.trim()) {
      return res
        .status(502)
        .json({ message: "This agent did not return a response" });
    }
    await axios.post(
      `${process.env.CHAT_SERVICE}/save-messge`,
      {
        conversationId,
        content: response,
        role: "assistant",
        images: result?.images,
        artifacts: result?.artifacts,
        files: result?.files,
      },
      options,
    );
    await invalidateMemory(conversationId, userId);
    return res.status(200).json({
      answer: response,
      images: Array.isArray(result.images) ? result.images : [],
      artifacts: result?.artifacts,
      files: Array.isArray(result.files) ? result.files : [],
      user: result?.user || null,
    });
  } catch (error) {
    console.error("Agent request failed:", error.message);
    if (next) return next(error);
    const upstreamStatus = error.response?.status;
    const status = [400, 401, 402, 403, 404, 429].includes(upstreamStatus)
      ? upstreamStatus
      : [400, 401, 402, 403, 404, 429].includes(error.status)
        ? error.status
        : 500;
    return res.status(status).json({
      message:
        status === 404
          ? "Conversation not found"
          : error.message || "Agent request failed",
    });
  }
};
