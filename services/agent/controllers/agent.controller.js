import axios from "axios";
import mongoose from "mongoose";
import { graph } from "../graph/graph.js";
import { getMemory, invalidateMemory } from "../utils/memory.js";

export const agent = async (req, res) => {
  try {
    const { prompt, conversationId, agent } = req.body || {};
    const file=req.file
    const userId = req.headers["x-user-id"];
    if (typeof userId !== "string" || !userId.trim()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (
      !mongoose.isObjectIdOrHexString(conversationId) ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        message: "A conversation ID and nonempty prompt are required",
      });
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
        content: prompt.trim(),
        role: "user",
      },
      options,
    );
    await invalidateMemory(conversationId, userId);
    const result = await graph.invoke({
      prompt: prompt.trim(),
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
    const upstreamStatus = error.response?.status;
    const status = [400, 401, 403, 404].includes(upstreamStatus)
      ? upstreamStatus
      : 500;
    return res.status(status).json({
      message:
        status === 404
          ? "Conversation not found"
          : error,
    });
  }
};
