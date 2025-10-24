const STORAGE_KEY = "agent_preferences"

export function getAgentPreferences(userId: string): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    if (!stored) {
      return {}
    }
    return JSON.parse(stored)
  } catch (error) {
    console.error("[v0] Error loading agent preferences from localStorage:", error)
    return {}
  }
}

export function toggleAgentVisibility(userId: string, agentId: string, isVisible: boolean): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    const preferences = getAgentPreferences(userId)
    preferences[agentId] = isVisible
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(preferences))
    console.log(`[v0] Agent ${agentId} visibility set to ${isVisible}`)
  } catch (error) {
    console.error("[v0] Error saving agent preferences to localStorage:", error)
    throw error
  }
}
