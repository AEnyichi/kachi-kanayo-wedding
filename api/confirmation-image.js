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

    const templateResponse = await fetch(templateUrl);

    if (!templateResponse.ok) {
      throw new Error("Could not load RSVP confirmation template");
    }

    const templateBuffer = Buffer.from(
      await templateResponse.arrayBuffer()
    );

    const metadata = await sharp(templateBuffer).metadata();
    const width = metadata.width;
    const height = metadata.height;

    const fontPath = path.join(
      process.cwd(),
      "fonts",
      "NotoSans-Regular.ttf"
    );

    const escapeXml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const safeName = escapeXml(name);
    const safeGuestId = escapeXml(guestId);

   const textSvg = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${width}"
    height="${height}"
    viewBox="0 0 ${width} ${height}"
  >
    <rect
      x="245"
      y="535"
      width="590"
      height="95"
    fill="#f7efdf" fill-opacity="0.88"
    />

    <text
      x="540"
      y="590"
      text-anchor="middle"
      font-family="Noto Sans"
      font-size="30"
      fill="#594323"
    >Dear ${safeName},</text>

    <rect
      x="320"
      y="1080"
      width="440"
      height="90"
  fill="#f7efdf" fill-opacity="0.88"
    />

    <text
      x="540"
      y="1140"
      text-anchor="middle"
      font-family="Noto Sans"
      font-size="30"
      fill="#594323"
    >${safeGuestId}</text>
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

    const qrBuffer = await QRCode.toBuffer(guestId, {
      type: "png",
      width: 330,
      margin: 1,
      errorCorrectionLevel: "H"
    });

    const finalImage = await sharp(templateBuffer)
      .composite([
        {
          input: textBuffer,
          left: 0,
          top: 0
        },
        {
          input: qrBuffer,
          left: 375,
          top: 775
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
