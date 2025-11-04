-- =====================================================
-- Script: 034_create_agent_groups_junction.sql
-- Description: Creates junction table for many-to-many relationship between agents and groups
-- =====================================================

-- Step 1: Create the junction table
CREATE TABLE IF NOT EXISTS public.agent_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  group_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT agent_groups_pkey PRIMARY KEY (id),
  CONSTRAINT agent_groups_unique UNIQUE (agent_id, group_id),
  CONSTRAINT fk_agent_groups_agent_id FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_agent_groups_group_id FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_groups_agent_id ON public.agent_groups USING btree (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_groups_group_id ON public.agent_groups USING btree (group_id);

-- Step 3: Migrate existing data from agents.group_id to agent_groups junction table
INSERT INTO public.agent_groups (agent_id, group_id)
SELECT a.id, a.group_id
FROM public.agents a
WHERE a.group_id IS NOT NULL
ON CONFLICT (agent_id, group_id) DO NOTHING;

-- Step 4: Create the same junction table for custom_agents
CREATE TABLE IF NOT EXISTS public.custom_agent_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  custom_agent_id uuid NOT NULL,
  group_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT custom_agent_groups_pkey PRIMARY KEY (id),
  CONSTRAINT custom_agent_groups_unique UNIQUE (custom_agent_id, group_id),
  CONSTRAINT fk_custom_agent_groups_agent_id FOREIGN KEY (custom_agent_id) REFERENCES public.custom_agents(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_agent_groups_group_id FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE
);

-- Step 5: Create indexes for custom_agent_groups
CREATE INDEX IF NOT EXISTS idx_custom_agent_groups_agent_id ON public.custom_agent_groups USING btree (custom_agent_id);
CREATE INDEX IF NOT EXISTS idx_custom_agent_groups_group_id ON public.custom_agent_groups USING btree (group_id);

-- Step 6: Migrate existing data from custom_agents.group_id to custom_agent_groups
INSERT INTO public.custom_agent_groups (custom_agent_id, group_id)
SELECT ca.id, ca.group_id
FROM public.custom_agents ca
WHERE ca.group_id IS NOT NULL
ON CONFLICT (custom_agent_id, group_id) DO NOTHING;

-- Note: We keep the group_id columns in agents and custom_agents tables for backward compatibility
-- They can be removed in a future migration after all code is updated to use the junction tables

COMMENT ON TABLE public.agent_groups IS 'Junction table for many-to-many relationship between agents and groups';
COMMENT ON TABLE public.custom_agent_groups IS 'Junction table for many-to-many relationship between custom agents and groups';
