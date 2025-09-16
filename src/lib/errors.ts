export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NonceError extends AppError {
  constructor(message: string = 'Nonce expired or already used') {
    super(message, 'NONCE_ERROR', 400);
  }
}

export class SignatureError extends AppError {
  constructor(message: string = 'Invalid signature') {
    super(message, 'SIGNATURE_ERROR', 400);
  }
}

export class PolicyError extends AppError {
  constructor(message: string = 'Policy requirements not met') {
    super(message, 'POLICY_ERROR', 403);
  }
}

export class TelegramError extends AppError {
  constructor(message: string = 'Telegram API error') {
    super(message, 'TELEGRAM_ERROR', 500);
  }
}