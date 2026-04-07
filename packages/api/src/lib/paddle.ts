import { Paddle, Environment } from "@paddle/paddle-node-sdk";

const isSandbox = process.env.NODE_ENV !== "production";

export const paddle = new Paddle(
  isSandbox
    ? process.env.PADDLE_SANDBOX_API_KEY!
    : process.env.PADDLE_API_KEY!,
  {
    environment: isSandbox ? Environment.sandbox : Environment.production,
  }
);
