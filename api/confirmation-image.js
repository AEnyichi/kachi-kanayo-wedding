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

    /*
      Generate the guest QR code
    */
    const qrBuffer = await QRCode.toBuffer(guestId, {
      width: 330,
      margin: 1,
      errorCorrectionLevel: "H"
    });

    /*
      The RSVP artwork is 1080 × 1350.
    */
    const width = 1080;
    const height = 1350;

    /*
      QR position
      This sits inside the existing white QR frame.
    */
    const qrLeft = 375;
    const qrTop = 775;

    /*
      Text overlay.
      We cover only the placeholder text areas,
      then add the personalized information.
    */
    const textSvg = `
      <svg width="${width}" height="${height}">

        <!-- Cover the existing guest-name placeholder -->
        <rect
          x="245"
          y="545"
          width="590"
          height="85"
          fill="#f8f0df"
          opacity="0.96"
        />

        <!-- Guest name -->
        <text
          x="540"
          y="610"
          text-anchor="middle"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="48"
          font-style="italic"
          fill="#805622"
        >
          Dear ${escapeXml(name)}
        </text>

        <!-- Cover the existing Guest ID placeholder -->
        <rect
          x="340"
          y="1085"
          width="400"
          height="75"
          fill="#f8f0df"
          opacity="0.96"
        />

        <!-- Guest ID -->
        <text
          x="540"
          y="1135"
          text-anchor="middle"
          font-family="Georgia, 'Times New Roman', serif"
          font-size="34"
          font-weight="bold"
          fill="#805622"
        >
          ${escapeXml(guestId)}
        </text>

      </svg>
    `;

    const result = await sharp(templateBuffer)
      .composite([
        {
          input: qrBuffer,
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
