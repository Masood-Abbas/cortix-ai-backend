import { Colors } from "./colors.js";

const PAGE_BOTTOM_PADDING = 72;
const PAGE_BOTTOM = (doc) => doc.page.height - PAGE_BOTTOM_PADDING;
const LEFT = 50;
const RIGHT = 50;
const BULLET_X = 55;
const TEXT_X = 72;
const TEXT_WIDTH = (doc) => doc.page.width - TEXT_X - RIGHT;

const ensureSpace = (doc, requiredHeight = 0) => {
  if (doc.y + requiredHeight > PAGE_BOTTOM(doc)) {
    doc.addPage();
    doc.y = 50;
    return true;
  }
  return false;
};

const sectionHeight = (doc, heading) => {
  const width = doc.page.width - LEFT - RIGHT;
  const headingHeight = doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .heightOfString(heading, { width });
  return headingHeight + 18;
};

const pointHeight = (doc, point) =>
  doc
    .font("Helvetica")
    .fontSize(11)
    .heightOfString(point, {
      width: TEXT_WIDTH(doc),
      lineGap: 2,
    }) + 8;

export const addContent = (doc, sections = []) => {
  sections.forEach((section, sectionIndex) => {
    const heading = section.heading || `Section ${sectionIndex + 1}`;
    ensureSpace(doc, sectionHeight(doc, heading));

    // Section heading
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(Colors.heading)
      .text(heading, {
        width: doc.page.width - LEFT - RIGHT,
      });

    // Accent line
    doc
      .moveDown(0.18)
      .save()
      .moveTo(LEFT, doc.y)
      .lineTo(95, doc.y)
      .lineWidth(2)
      .strokeColor(Colors.primary)
      .stroke()
      .restore();

    doc.moveDown(0.35);

    const points = section?.points || [];

    points.forEach((point) => {
      ensureSpace(doc, pointHeight(doc, point));

      // Bullet
      doc
        .save()
        .circle(BULLET_X, doc.y + 6, 2.4)
        .fill(Colors.primary)
        .restore();

      // Point
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(Colors.text)
        .text(point, TEXT_X, doc.y, {
          width: TEXT_WIDTH(doc),
          lineGap: 2,
        });

      doc.y += 7;
    });

    doc.y += 10;
  });
};
