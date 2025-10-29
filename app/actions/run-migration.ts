"use server"

import { createClient } from "@supabase/supabase-js"

export async function runAgentManagementMigration() {
  try {
    console.log("[v0] Starting agent management migration...")

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Execute migration SQL commands one by one
    // Add is_active column
    console.log("[v0] Adding is_active column...")
    const { error: error1 } = await supabase.rpc("exec_sql", {
      query: "ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;",
    })

    if (error1) {
      console.error("[v0] Error adding is_active:", error1)
      throw new Error(`Erro ao adicionar coluna is_active: ${error1.message}`)
    }

    // Add group_name column
    console.log("[v0] Adding group_name column...")
    const { error: error2 } = await supabase.rpc("exec_sql", {
      query: "ALTER TABLE agents ADD COLUMN IF NOT EXISTS group_name text DEFAULT 'Geral';",
    })

    if (error2) {
      console.error("[v0] Error adding group_name:", error2)
      throw new Error(`Erro ao adicionar coluna group_name: ${error2.message}`)
    }

    // Add display_order column
    console.log("[v0] Adding display_order column...")
    const { error: error3 } = await supabase.rpc("exec_sql", {
      query: "ALTER TABLE agents ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;",
    })

    if (error3) {
      console.error("[v0] Error adding display_order:", error3)
      throw new Error(`Erro ao adicionar coluna display_order: ${error3.message}`)
    }

    // Update existing agents
    console.log("[v0] Updating existing agents...")
    const { error: error4 } = await supabase.rpc("exec_sql", {
      query: 'UPDATE agents SET display_order = COALESCE("order", 0) WHERE display_order = 0;',
    })

    if (error4) {
      console.error("[v0] Error updating agents:", error4)
      // This is not critical, continue
    }

    // Create indexes
    console.log("[v0] Creating indexes...")
    const { error: error5 } = await supabase.rpc("exec_sql", {
      query: `
        CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
        CREATE INDEX IF NOT EXISTS idx_agents_group_name ON agents(group_name);
        CREATE INDEX IF NOT EXISTS idx_agents_display_order ON agents(display_order);
      `,
    })

    if (error5) {
      console.error("[v0] Error creating indexes:", error5)
      // This is not critical, continue
    }

    console.log("[v0] Migration completed successfully!")
    return {
      success: true,
      message: "Migração executada com sucesso! As colunas foram adicionadas à tabela de agentes.",
    }
  } catch (error) {
    console.error("[v0] Migration error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido ao executar migração",
    }
  }
}
