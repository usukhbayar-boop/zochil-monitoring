
export default class CustomError extends Error {
  error_message: string;
  constructor(message: string, error_message: string) {
    super(message);
    this.name = "CustomError";
    this.error_message = error_message;
  }
}
