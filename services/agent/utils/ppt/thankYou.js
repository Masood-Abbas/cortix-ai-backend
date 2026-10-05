import { Colors } from "./color.js";


export const addThankYou = (ppt) => {
  const slide = ppt.addSlide();

  slide.background = {
    color: Colors.secondary,
  };


 

  // Label
  slide.addText("CORTEXAI", {
    x: 0,
    y: 1.55,
    w: 13.33,
    h: 0.25,
    align: "center",
    color: Colors.cyan,
    fontSize: 11,
    bold: true,
    charSpacing: 2,
    margin: 0,
  });

  // Main title
  slide.addText("Thank You", {
    x: 0,
    y: 2.05,
    w: 13.33,
    h: 0.9,
    align: "center",
    color: Colors.white,
    bold: true,
    fontSize: 40,
    margin: 0,
  });

  slide.addText("Generated with CortexAI", {
    x: 0,
    y: 3.15,
    w: 13.33,
    h: 0.4,
    align: "center",
    color: "CBD5E1",
    fontSize: 16,
    margin: 0,
  });

  // CTA
  slide.addShape(ppt.ShapeType.roundRect, {
    x: 5.1,
    y: 4.05,
    w: 3.1,
    h: 0.55,
    fill: {
      color: Colors.primary,
    },
    line: {
      color: Colors.primary,
      transparency: 100,
    },
  });

  slide.addText("AI • CREATE • PRESENT", {
    x: 5.1,
    y: 4.21,
    w: 3.1,
    h: 0.18,
    align: "center",
    color: Colors.white,
    fontSize: 9,
    bold: true,
    charSpacing: 1,
    margin: 0,
  });

  slide.addText("Powered by CortexAI", {
    x: 0,
    y: 6.6,
    w: 13.33,
    h: 0.2,
    align: "center",
    color: "64748B",
    fontSize: 9,
    margin: 0,
  });
};