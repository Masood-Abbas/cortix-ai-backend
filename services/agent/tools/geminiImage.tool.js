import { GoogleGenAI } from "@google/genai";
import { uploadTOS3 } from "../utils/uplodeToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-exp";

const imageAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
});

/** Generate an image with Gemini, upload it to S3, and return its temporary URL. */
export const generateImageWithGemini = async (prompt) => {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured");
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("An image prompt is required");
  }

  const response = await imageAI.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt.trim(),
    config: { responseModalities: ["IMAGE"] },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/"),
  );
  if (!imagePart) throw new Error("Gemini did not return image data");

  const mimeType = imagePart.inlineData.mimeType;
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[mimeType];
  if (!extension) throw new Error(`Unsupported Gemini image format: ${mimeType}`);

  const fileName = `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  await uploadTOS3(fileName, Buffer.from(imagePart.inlineData.data, "base64"), mimeType);
  const url = await getFromS3(fileName, 24 * 60);
  if (!url) throw new Error("Could not create the image download link");

  return { url, model: IMAGE_MODEL, mimeType };
};
