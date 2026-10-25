export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { email, name, guestId } = req.body || {};

    if (!email || !name || !guestId) {
      return res.status(400).json({
        success: false,
        error: "Email, name and guestId are required."
      });
    }

    const apiKey = process.env.BREVO_API_KEY_NEW;

    if (!apiKey) {
      console.error("Brevo API key is missing.");

      return res.status(500).json({
        success: false,
        error: "Email service is not configured."
      });
    }

    const host = req.headers.host;

    if (!host) {
      return res.status(500).json({
        success: false,
        error: "Unable to create the confirmation link."
      });
    }

    const baseUrl = `https://${host}`;

    const confirmationUrl =
      `${baseUrl}/api/confirmation-image` +
      `?name=${encodeURIComponent(name)}` +
      `&guestId=${encodeURIComponent(guestId)}`;

    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          templateId: 1,
          to: [
            {
              email: email,
              name: name
            }
          ],
          params: {
            name: name,
            guestId: guestId,
            confirmation_url: confirmationUrl
          }
        })
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { message: responseText };
    }

    if (!response.ok) {
      console.error("Brevo email request failed:", response.status, data);

      return res.status(502).json({
        success: false,
        error: "Brevo could not send the confirmation email.",
        details: data
      });
    }

    console.log("Brevo accepted confirmation email:", data.messageId);

    return res.status(200).json({
      success: true,
      message: "Confirmation email accepted by Brevo.",
      messageId: data.messageId || null
    });

  } catch (error) {
    console.error("Confirmation email error:", error);

    return res.status(500).json({
      success: false,
      error: "An error occurred while sending the confirmation email."
    });
  }
}
