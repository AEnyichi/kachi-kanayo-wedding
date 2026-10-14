import QRCode from "qrcode";
import sharp from "sharp";
import fs from "fs";
import path from "path";

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
      throw new Error("Could not load RSVP template");
    }

    const templateBuffer = Buffer.from(
      await templateResponse.arrayBuffer()
    );

    // Load the font uploaded to GitHub
    const fontPath = path.join(
      process.cwd(),
      "fonts",
      "NotoSans-Regular.ttf"
    );

    const fontBuffer = fs.readFileSync(fontPath);

    // Generate the guest QR code
    const qrBuffer = await QRCode.toBuffer(guestId, {
      width: 330,
      margin: 1,
      errorCorrectionLevel: "H"
    });

    const width = 1080;
    const height = 1350;

    // Embed the actual font as a data URL inside the SVG
    const fontBase64 = fontBuffer.toString("base64");

    const textSvg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
      >
        <defs>
          <style>
            @font-face {
              font-family: 'GuestFont';
              src: url(data:font/ttf;base64,${fontBase64})
                   format('truetype');
            }
            text {
              font-family: 'GuestFont';
            }
          </style>
        </defs>

        <rect
          x="245"
          y="535"
          width="590"
          height="95"
          rx="8"
          fill="#f8f0df"
        />

        <text
          x="540"
          y="600"
          text-anchor="middle"
          font-size="46"
          fill="#805622"
        >Dear ${escapeXml(name)}</text>

        <rect
          x="320"
          y="1080"
          width="440"
          height="90"
          rx="8"
          fill="#f8f0df"
        />

        <text
          x="540"
          y="1140"
          text-anchor="middle"
          font-size="34"
          font-weight="bold"
          fill="#805622"
        >${escapeXml(guestId)}</text>
      </svg>
    `;

    const result = await sharp(templateBuffer)
      .composite([
        {
          input: qrBuffer,
          left: 375,
          top: 775
        },
        {
          input: Buffer.from(textSvg),
          left: 0,
          top: 0
        }
      ])
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(result);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
