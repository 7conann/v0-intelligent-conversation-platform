export const ADMIN_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

export function isAdminUser(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export function isTrialExpired(createdAt: string): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  const diffInDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  return diffInDays > 7
}

export function getDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  const diffInDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(7 - diffInDays))
}
