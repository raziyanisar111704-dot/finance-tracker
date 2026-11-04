// An error that is safe to show to the user. Anything that is NOT an AppError
// is treated as an unexpected bug: logged on the server, hidden from the client.
export class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
