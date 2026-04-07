export class VeridianError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "VeridianError";
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, VeridianError.prototype);
  }
}
