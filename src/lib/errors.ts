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
