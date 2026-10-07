export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name, guestId } = req.body || {};

    if (!email || !name || !guestId) {
      return res.status(400).json({
        error: "email, name and guestId are required"
      });
    }

    const baseUrl = `https://${req.headers.host}`;

    const confirmationUrl =
      `${baseUrl}/api/confirmation-image` +
      `?name=${encodeURIComponent(name)}` +
      `&guestId=${encodeURIComponent(guestId)}`;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
       "api-key": process.env.BREVO_API_KEY_NEW,
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
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data.messageId
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
