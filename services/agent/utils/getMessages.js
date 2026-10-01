import axios from "axios";

export const getMessages = async (conversationId, userId) => {
  const { data } = await axios.get(`${process.env.CHAT_SERVICE}/get-messge/${conversationId}`, {
    headers: { "x-user-id": userId },
    timeout: 15000,
  });
  if (!Array.isArray(data)) throw new Error("Invalid conversation history");
  return data;
};
