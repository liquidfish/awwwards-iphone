"use client";

import Script from "next/script";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (callback: () => void) => void;
      render: (
        container: HTMLElement,
        parameters: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

const initialFormData = {
  first_name: "",
  last_name: "",
  email: "",
  handle: "",
};

const Form = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [captchaToken, setCaptchaToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const renderAttemptRef = useRef(0);

  const renderCaptcha = () => {
    if (!RECAPTCHA_SITE_KEY || !captchaRef.current || widgetIdRef.current !== null) {
      return;
    }

    const grecaptcha = window.grecaptcha;

    if (!grecaptcha || typeof grecaptcha.render !== "function") {
      if (renderAttemptRef.current >= 20) {
        setStatus({
          type: "error",
          message: "Captcha could not be loaded. Please try again.",
        });
        return;
      }

      renderAttemptRef.current += 1;
      window.setTimeout(renderCaptcha, 250);
      return;
    }

    const mountCaptcha = () => {
      if (!captchaRef.current || widgetIdRef.current !== null) {
        return;
      }

      widgetIdRef.current = grecaptcha.render(captchaRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token: string) => {
          setCaptchaToken(token);
          setStatus((current) =>
            current.type === "error" ? { type: "idle", message: "" } : current
          );
        },
        "expired-callback": () => {
          setCaptchaToken("");
        },
        "error-callback": () => {
          setCaptchaToken("");
          setStatus({
            type: "error",
            message: "Captcha could not be loaded. Please try again.",
          });
        },
      });
    };

    if (typeof grecaptcha.ready === "function") {
      grecaptcha.ready(mountCaptcha);
      return;
    }

    mountCaptcha();
  };

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      setStatus({
        type: "error",
        message: "Captcha is not configured.",
      });
      return;
    }

    renderCaptcha();
  }, []);

  const resetCaptcha = () => {
    if (window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
    }

    setCaptchaToken("");
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!captchaToken) {
      setStatus({
        type: "error",
        message: "Please complete the captcha before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/create-your-app", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          captchaToken,
        }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit the form.");
      }

      setFormData(initialFormData);
      resetCaptcha();
      setStatus({
        type: "success",
        message: "Form submitted successfully.",
      });
    } catch (error) {
      resetCaptcha();
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to submit the form.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="contact"
      className="contact z-20 flex h-full min-h-screen w-full items-center justify-center"
    >
      <Script
        src="https://www.google.com/recaptcha/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderCaptcha}
      />

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-6 rounded-md bg-[#0f0f0f] p-8"
      >
        <div className="text-center">
          <h1 className="mb-2 font-sans text-3xl font-extrabold text-white">
            Create your app
          </h1>
          <p className="text-sm text-gray-400">
            Let&apos;s get started building your world
          </p>
        </div>

        <div>
          <label
            htmlFor="first_name"
            className="mb-2 block text-sm text-gray-400"
          >
            First Name
          </label>
          <input
            id="first_name"
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className="w-full rounded-md border border-[#2a2a2a] bg-[#1c1c1c] p-3 text-white focus:ring-2 focus:ring-white focus:outline-none"
            placeholder="Jane"
            required
          />
        </div>

        <div>
          <label
            htmlFor="last_name"
            className="mb-2 block text-sm text-gray-400"
          >
            Last Name
          </label>
          <input
            id="last_name"
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className="w-full rounded-md border border-[#2a2a2a] bg-[#1c1c1c] p-3 text-white focus:ring-2 focus:ring-white focus:outline-none"
            placeholder="Doe"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-gray-400">
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-md border border-[#2a2a2a] bg-[#1c1c1c] p-3 text-white focus:ring-2 focus:ring-white focus:outline-none"
            placeholder="jane@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="handle" className="mb-2 block text-sm text-gray-400">
            Instagram / Tiktok Handle
          </label>
          <input
            id="handle"
            type="text"
            name="handle"
            value={formData.handle}
            onChange={handleChange}
            className="w-full rounded-md border border-[#2a2a2a] bg-[#1c1c1c] p-3 text-white focus:ring-2 focus:ring-white focus:outline-none"
            placeholder="@janedoe"
            required
          />
        </div>

        <div
          ref={captchaRef}
          className="min-h-[78px] overflow-hidden rounded-md"
        />

        {status.type !== "idle" ? (
          <p
            className={status.type === "success" ? "text-sm text-green-400" : "text-sm text-red-400"}
          >
            {status.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-white py-3 text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
        </button>
      </form>
    </div>
  );
};

export default Form;
