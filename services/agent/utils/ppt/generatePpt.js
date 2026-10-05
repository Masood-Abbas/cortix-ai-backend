import pptxgen from "pptxgenjs";
import { addCover } from "./coverSlide.js";
import { addContentSlide } from "./contentSlide.js";
import { addThankYou } from "./thankYou.js";


export const generatePpt = async (data) => {
  try {
    const ppt = new pptxgen();

    ppt.layout = "LAYOUT_WIDE";
    ppt.author = "CortexAI";
    ppt.title = data.title;
    ppt.subject = data.title;
    ppt.company = "CortexAI";
    ppt.lang = "en-US";

    ppt.theme = {
      headFontFace: "Aptos Display",
      bodyFontFace: "Aptos",
      lang: "en-US",
    };

    // Cover
    addCover(ppt, data);

    // Content
    data?.slides?.forEach((slide, index) => {
      addContentSlide(
        ppt,
        slide.title,
        slide.points || [],
        index + 1,
        data.slides.length
      );
    });

    // Thank you
    addThankYou(ppt);

    return ppt;
  } catch (error) {
    console.error("PPT generation error:", error);
    throw error;
  }
};