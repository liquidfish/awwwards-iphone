import { NextRequest, NextResponse } from "next/server";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

const WEBHOOK_URL =
  "https://api.staging-aggregate.liquidfish.xyz/api/webhooks/forms/019d1a10-9fab-70cf-b260-2c929ef8247a";

type FormPayload = {
  first_name: string;
  last_name: string;
  email: string;
  handle: string;
  captchaToken: string;
};

export async function POST(request: NextRequest) {
  try {
    if (!RECAPTCHA_SECRET_KEY) {
      return NextResponse.json(
        { error: "Captcha secret key is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as Partial<FormPayload>;
    const first_name = body.first_name?.trim() ?? "";
    const last_name = body.last_name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const handle = body.handle?.trim() ?? "";
    const captchaToken = body.captchaToken?.trim() ?? "";

    if (!first_name || !last_name || !email || !handle || !captchaToken) {
      return NextResponse.json(
        { error: "Missing required form fields." },
        { status: 400 }
      );
    }

    const captchaResponse = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: RECAPTCHA_SECRET_KEY,
          response: captchaToken,
        }),
      }
    );

    const captchaResult = (await captchaResponse.json()) as {
      success?: boolean;
    };

    if (!captchaResult.success) {
      return NextResponse.json(
        { error: "Captcha verification failed." },
        { status: 400 }
      );
    }

    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name,
        last_name,
        email,
        handle,
      }),
    });

    if (!webhookResponse.ok) {
      return NextResponse.json(
        { error: "Webhook request failed." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
