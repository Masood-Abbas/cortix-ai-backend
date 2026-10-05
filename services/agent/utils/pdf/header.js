import { Colors } from "./colors.js";

export const addHeader = (doc, data) => {
  // Top accent bar
  doc
    .save()
    .rect(0, 0, doc.page.width, 6)
    .fill(Colors.primary)
    .restore();

  // Brand
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(Colors.primary)
    .text("CORTEXAI", 50, 40);

  // Title
  doc
    .moveDown(1.4)
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor(Colors.heading)
    .text(data.title || "Untitled Document", {
      align: "center",
    });

  // Accent line
  const centerX = doc.page.width / 2;

  doc
    .moveDown(0.45)
    .save()
    .moveTo(centerX - 35, doc.y)
    .lineTo(centerX + 35, doc.y)
    .lineWidth(3)
    .strokeColor(Colors.primary)
    .stroke()
    .restore();

  // Subtitle
  if (data.subtitle) {
    doc
      .moveDown(0.5)
      .font("Helvetica")
      .fontSize(12)
      .fillColor(Colors.muted)
      .text(data.subtitle, {
        align: "center",
      });
  }

  doc.moveDown(1.2);
};
