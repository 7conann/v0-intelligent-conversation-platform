export const ADMIN_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

export function isAdminUser(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export function isTrialExpired(email: string, createdAt: string, expirationDate?: string | null): boolean {
  // Admin users never expire
  if (isAdminUser(email)) return false

  if (!expirationDate) {
    // Non-admin users without expiration date: calculate from creation date (7 days trial)
    const created = new Date(createdAt)
    const trialEnd = new Date(created)
    trialEnd.setDate(trialEnd.getDate() + 7)
    return new Date() > trialEnd
  }

  const expiration = new Date(expirationDate)
  const now = new Date()
  return now > expiration
}

export function getDaysRemaining(email: string, createdAt: string, expirationDate?: string | null): number {
  // Only actual admin users get 999 days
  if (isAdminUser(email)) {
    return 999
  }

  // Non-admin users without expiration date: calculate from creation date (7 days trial)
  if (!expirationDate) {
    const created = new Date(createdAt)
    const trialEnd = new Date(created)
    trialEnd.setDate(trialEnd.getDate() + 7)
    const now = new Date()
    const diffInMs = trialEnd.getTime() - now.getTime()
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)
    return Math.max(0, Math.ceil(diffInDays))
  }

  const expiration = new Date(expirationDate)
  const now = new Date()
  const diffInMs = expiration.getTime() - now.getTime()
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

  return Math.max(0, Math.ceil(diffInDays))
}
