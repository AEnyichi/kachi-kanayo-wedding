import QRCode from "qrcode";
import sharp from "sharp";

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

    const qrBuffer = await QRCode.toBuffer(guestId, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: "H"
    });

    const qrImage = await sharp(qrBuffer)
      .resize(360, 360)
      .png()
      .toBuffer();

    const image = sharp(templateBuffer);
    const metadata = await image.metadata();

    const width = metadata.width || 1080;

    /*
      The template is designed at 1080 × 1350.
      QR is placed inside the white QR area.
      Guest name and ID are overlaid onto the card.
    */

    const qrLeft = Math.round(width * 0.30);
    const qrTop = Math.round((metadata.height || 1350) * 0.59);

    const textSvg = `
      <svg width="${width}" height="${metadata.height || 1350}">
        <style>
          .name {
            font-family: Georgia, serif;
            font-size: 34px;
            fill: #8a6a2f;
            text-anchor: middle;
          }

          .guestId {
            font-family: Arial, sans-serif;
            font-size: 24px;
            fill: #8a6a2f;
            text-anchor: middle;
          }
        </style>

        <text
          x="${width / 2}"
          y="${Math.round((metadata.height || 1350) * 0.43)}"
          class="name"
        >
          ${escapeXml(name)}
        </text>

        <text
          x="${width / 2}"
          y="${Math.round((metadata.height || 1350) * 0.84)}"
          class="guestId"
        >
          ${escapeXml(guestId)}
        </text>
      </svg>
    `;

    const result = await image
      .composite([
        {
          input: qrImage,
          left: qrLeft,
          top: qrTop
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
