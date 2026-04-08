import { Paddle, Environment } from "@paddle/paddle-node-sdk";

const isSandbox = process.env.NODE_ENV !== "production";

const paddleApiKey = isSandbox
  ? process.env.PADDLE_SANDBOX_API_KEY
  : process.env.PADDLE_API_KEY;

if (!paddleApiKey) {
  throw new Error(
    isSandbox
      ? "Missing PADDLE_SANDBOX_API_KEY env var"
      : "Missing PADDLE_API_KEY env var"
  );
}

export const paddle = new Paddle(paddleApiKey, {
  environment: isSandbox ? Environment.sandbox : Environment.production,
});
