import redis from "../../../shared/redis/redis.js";
import { getMessages } from "./getMessages.js";

const memoryKey = (conversationId, userId) => {
  if (!conversationId || !userId) throw new Error("Conversation and user IDs are required");
  return `chat-memory:${userId}:${conversationId}`;
};

// Call only after the chat service has checked ownership of the conversation.
export const getMemory = async (conversationId, userId) => {
  const key = memoryKey(conversationId, userId);
  try {
    const cached = await redis.get(key);
    if (cached) {
      const messages = JSON.parse(cached);
      if (Array.isArray(messages)) return messages.slice(-20);
    }
  } catch { /* MongoDB remains the source of truth when the cache is unavailable. */ }
  const messages = (await getMessages(conversationId, userId)).slice(-20);
  try { await redis.set(key, JSON.stringify(messages), "EX", 86400); }
  catch { /* Caching must not fail a chat request. */ }
  return messages;
};

export const invalidateMemory = async (conversationId, userId) => {
  const key = memoryKey(conversationId, userId);
  try { await redis.del(key); }
  catch { /* The database write has already succeeded. */ }
};
