import PDFDocument from "pdfkit";

import { addHeader } from "./header.js";
import { addContent } from "./content.js";

export const generatePdf = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        autoFirstPage: true,

        info: {
          Author: "CortexAI",
          Title: data?.title || "CortexAI Document",
          Creator: "CortexAI",
          Subject: data?.title || "Generated Document",
        },
      });

      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => {
        reject(error);
      });

      // -----------------------------
      // First page
      // -----------------------------

      addHeader(doc, data);

      addContent(doc, data?.section || []);

      // -----------------------------
      // Finish PDF
      // -----------------------------

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
