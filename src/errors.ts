class CustomError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DuplicatedSubscriptionError extends CustomError {
  username: string;

  constructor(username: string) {
    super(`${username} has already been subscribed`);
    this.username = username;
  }
}

export class SilentError extends CustomError {}
