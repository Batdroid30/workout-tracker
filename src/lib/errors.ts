export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly fields?: string[]) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class APIError extends Error {
  constructor(message: string, public readonly status: number = 500, public readonly cause?: unknown) {
    super(message)
    this.name = 'APIError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class CoachError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'CoachError'
  }
}

export class CoachRateLimitError extends CoachError {
  constructor(public readonly resetAt: Date) {
    super('Daily coach message limit reached. Resets at midnight.')
    this.name = 'CoachRateLimitError'
  }
}

