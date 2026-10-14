import QRCode from "qrcode";
import sharp from "sharp";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

export default async function handler(req, res) {
  try {
    const { name, guestId } = req.query;

    if (!name || !guestId) {
      return res.status(400).json({
        error: "name and guestId are required"
      });
    }

    const templateUrl =
      "https://raw.githubusercontent.com/AEnyichi/kachi-kanayo-wedding/main/images/rsvp-confirmation-template.png";

    const response = await fetch(templateUrl);

    if (!response.ok) {
      throw new Error("Could not load the confirmation card template");
    }

    const templateBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    const metadata = await sharp(templateBuffer).metadata();
    const width = metadata.width;
    const height = metadata.height;

    const escapeXml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const safeName = escapeXml(name);
    const safeGuestId = escapeXml(guestId);

    const fontPath = path.join(
      process.cwd(),
      "fonts",
      "NotoSans-Regular.ttf"
    );

    // Keep the guest's name beneath the existing "Dear" text.
    // Keep the Guest ID separate from the QR code.
    const nameY = Math.round(height * 0.475);
    const guestIdY = Math.round(height * 0.81);

    const textSvg = `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="${width}"
           height="${height}"
           viewBox="0 0 ${width} ${height}">

        <text
          x="${width / 2}"
          y="${nameY}"
          text-anchor="middle"
          font-family="Noto Sans"
          font-size="${Math.round(width * 0.027)}"
          fill="#594323">${safeName}</text>

        <text
          x="${width / 2}"
          y="${guestIdY}"
          text-anchor="middle"
          font-family="Noto Sans"
          font-size="${Math.round(width * 0.021)}"
          fill="#594323">${safeGuestId}</text>

      </svg>
    `;

    const textBuffer = new Resvg(textSvg, {
      font: {
        fontFiles: [fontPath],
        loadSystemFonts: false,
        defaultFontFamily: "Noto Sans",
        sansSerifFamily: "Noto Sans"
      }
    }).render().asPng();

    // Generate a smaller QR code to fit within the gold frame.
    const qrSize = Math.round(
      Math.min(width * 0.22, height * 0.15)
    );

    const qrBuffer = await QRCode.toBuffer(
      String(guestId),
      {
        type: "png",
        width: qrSize,
        margin: 1,
        errorCorrectionLevel: "H"
      }
    );

    // Centre the QR code horizontally and position it in its frame.
    const qrLeft = Math.round((width - qrSize) / 2);
    const qrTop = Math.round(height * 0.575);

    const finalImage = await sharp(templateBuffer)
      .composite([
        {
          input: textBuffer,
          left: 0,
          top: 0
        },
        {
          input: qrBuffer,
          left: qrLeft,
          top: qrTop
        }
      ])
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(finalImage);

  } catch (error) {
    console.error("Confirmation image error:", error);

    return res.status(500).json({
      error: "Could not generate RSVP confirmation image"
    });
  }
}
