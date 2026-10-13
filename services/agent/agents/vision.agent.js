
import { GoogleGenAI } from "@google/genai";
import { getModel } from "../config/llmmodels.js";
import { uploadTOS3 } from "../utils/uplodeToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { deductCredit } from "../utils/deductCredit.js";
import { checkAgentLimit } from "../utils/Ratelimit/agentLimit.js";

const imageAI = new GoogleGenAI({
  apiKey:
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY,
});

const IMAGE_MODEL =
   "gemini-nano-banana-2.1";

const isGeminiQuotaError = (error) => {
  const status = error?.status ?? error?.response?.status;
  const text = [
    error?.message,
    error?.response?.data?.error?.message,
    error?.response?.data?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    status === 429 ||
    text.includes("resource_exhausted") ||
    text.includes("quota exceeded") ||
    text.includes("rate limit")
  );
};

const getRetryText = (error) => {
  const message =
    error?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    "";

  const retrySeconds =
    message.match(/retryDelay"?:"?(\d+)s/i)?.[1] ||
    message.match(/retry in\s+([^.,\n]+)/i)?.[1];

  if (!retrySeconds) return "Please try again later.";

  if (!/^\d+$/.test(retrySeconds)) {
    return `Please retry in ${retrySeconds.trim()}.`;
  }

  const seconds = Number(retrySeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);

  if (hours && minutes) return `Please retry in about ${hours}h ${minutes}m.`;
  if (hours) return `Please retry in about ${hours}h.`;
  return `Please retry in about ${minutes}m.`;
};

const getVisionErrorMessage = (error) => {
  const status = error?.status ?? error?.response?.status;

  if (status === 402) {
    return error.message;
  }

  if (isGeminiQuotaError(error)) {
    return `Gemini image generation quota is exhausted for ${IMAGE_MODEL}. ${getRetryText(error)} Check your Gemini plan, billing, or use another available image model in GEMINI_IMAGE_MODEL.`;
  }

  return "Unable to generate the image right now. Please try again.";
};

export const visionAgent = async (state) => {
  try {
    // 1. Check the user's rate limit.
    await checkAgentLimit(state.userId, "vision");

    // 2. Deduct credits using your existing utility.
    const creditResult = await deductCredit(
      state.userId,
      "vision",
      state.cookie
    );

    // 3. Enhance the user's request with your existing Gemini model.
    const llm = await getModel("vision");

    const promptResponse = await llm.invoke(`
You are an expert AI image-prompt engineer.

Transform the user's request into a detailed, visually coherent
image-generation prompt.

Requirements:
- Follow the user's intended subject, style, and composition.
- Use cinematic lighting where appropriate.
- Include professional composition and color harmony.
- Describe realistic textures, materials, and fine details.
- Use sharp focus and appropriate depth of field.
- Produce a polished, high-quality visual.
- Avoid adding unrelated subjects or changing the user's intent.
- Do not claim that the output will have a specific resolution unless requested.

Return only the final image-generation prompt.

User request:
${state.prompt}
`);

    const prompt =
      typeof promptResponse.content === "string"
        ? promptResponse.content.trim()
        : "";

    if (!prompt) {
      throw new Error("The AI did not return an image prompt.");
    }

    // 4. Generate the ACTUAL image with Gemini.
    const imageResponse = await imageAI.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
      config: {
        responseModalities: ["IMAGE"],
      },
    });

    // 5. Extract the generated image from Gemini's response.
    const parts =
      imageResponse.candidates?.[0]?.content?.parts ?? [];

    const generatedImage = parts.find(
      (part) =>
        part.inlineData?.data &&
        part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!generatedImage) {
      throw new Error(
        "Gemini did not return image data. Please try another prompt."
      );
    }

    const imageBuffer = Buffer.from(
      generatedImage.inlineData.data,
      "base64"
    );

    const mimeType = generatedImage.inlineData.mimeType;

    // 6. Choose a file extension that matches the actual image format.
    const extensionByMimeType = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    };

    const extension = extensionByMimeType[mimeType];

    if (!extension) {
      throw new Error(
        `Unsupported Gemini image format: ${mimeType}`
      );
    }

    const fileName = `image-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`;

    // 7. Upload the generated image to your existing S3 utility.
    await uploadTOS3(fileName, imageBuffer, mimeType);

    // 8. Generate a download link valid for 24 hours.
    const downloadUrl = await getFromS3(fileName, 24 * 60);

    if (!downloadUrl) {
      throw new Error("Could not create the image download link.");
    }

    // 9. Return the response in your existing state format.
    return {
      ...state,
      aiResponse:
        "# Image Generated Successfully\n\n" +
        "Your image has been generated using Google Gemini " +
        "and stored in S3. The download link expires in 24 hours.",
      images: [downloadUrl],
      user: creditResult?.user || state.user,
    };
  } catch (error) {
    console.error("Vision agent error:", error);

    const message = getVisionErrorMessage(error);

    return {
      ...state,
      aiResponse: message,
      images: [],
      user: error?.user || state.user,
    };
  }
};
