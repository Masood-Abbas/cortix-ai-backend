import test from "node:test";
import assert from "node:assert/strict";
import { generatePdf } from "../services/agent/utils/pdf/generatePdf.js";

const pageCount = (buffer) =>
  (buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;

test("PDF generator does not add extra pages for short content", async () => {
  const buffer = await generatePdf({
    title: "Short PDF",
    subtitle: "Compact generated document",
    section: [
      {
        heading: "Overview",
        points: ["One concise point.", "Another concise point."],
      },
      {
        heading: "Details",
        points: ["A short detail.", "A final short detail."],
      },
    ],
  });

  assert.equal(pageCount(buffer), 1);
});
