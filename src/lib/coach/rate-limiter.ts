import { getDailyUsageCount } from '@/lib/data/coach'

const DAILY_MESSAGE_LIMIT = 10

export interface RateLimitStatus {
  allowed: boolean
  currentUsage: number
  limit: number
  remaining: number
}

export async function checkCoachRateLimit(userId: string): Promise<RateLimitStatus> {
  const currentUsage = await getDailyUsageCount(userId)
  const remaining = Math.max(0, DAILY_MESSAGE_LIMIT - currentUsage)
  const allowed = currentUsage < DAILY_MESSAGE_LIMIT

  return {
    allowed,
    currentUsage,
    limit: DAILY_MESSAGE_LIMIT,
    remaining,
  }
}
