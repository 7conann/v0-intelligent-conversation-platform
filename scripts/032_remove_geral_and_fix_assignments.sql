-- Remove o default 'Geral' da coluna group_name
ALTER TABLE agents 
ALTER COLUMN group_name DROP DEFAULT;

-- Atualiza agentes com padrão "= Visão E+I" para o grupo "1. Visão e Educação"
UPDATE agents
SET group_name = '1. Visão e Educação'
WHERE group_name = 'Geral' 
  AND (
    name LIKE '%Visão E+I%' 
    OR name LIKE '%Estratégia%'
    OR name LIKE '%Finanças%'
    OR name LIKE '%Vendas%'
    OR name LIKE '%CX%CS%'
    OR name LIKE '%Educação%'
    OR name LIKE '%Prático%Direto%'
    OR name LIKE '%Diretor Comercial%'
  );

-- Atualiza agentes com padrão "= Orientador E+I" para o grupo "2. Orientador e Assistente"
UPDATE agents
SET group_name = '2. Orientador e Assistente'
WHERE group_name = 'Geral' 
  AND (
    name LIKE '%Orientador E+I%'
    OR name LIKE '%P&D%RH%'
    OR name LIKE '%NR%s%'
    OR name LIKE '%Reforma Tributária%'
    OR name LIKE '%Dados%Indicadores%'
  );

-- Atualiza agentes com padrão "= Agente E+I" para o grupo "3. Agente (faz por você)"
UPDATE agents
SET group_name = '3. Agente (faz por você)'
WHERE group_name = 'Geral' 
  AND name LIKE '%Agente E+I%';

-- Atualiza agentes com padrão "= Clone E+I" para o grupo "4. Clone (faz o papel do outro)"
UPDATE agents
SET group_name = '4. Clone (faz o papel do outro)'
WHERE group_name = 'Geral' 
  AND name LIKE '%Clone E+I%';

-- Atualiza agentes com padrão "= Automação E+I" para o grupo "5. Automação"
UPDATE agents
SET group_name = '5. Automação'
WHERE group_name = 'Geral' 
  AND name LIKE '%Automação E+I%';

-- Atualiza agentes restantes (como "Marketing") para "1. Visão e Educação" como padrão
UPDATE agents
SET group_name = '1. Visão e Educação'
WHERE group_name = 'Geral';

-- Verifica quantos agentes ainda têm 'Geral'
SELECT 
  COUNT(*) as total_geral,
  group_name
FROM agents
WHERE group_name = 'Geral'
GROUP BY group_name;

-- Mostra a distribuição de agentes por grupo
SELECT 
  group_name,
  COUNT(*) as total_agentes,
  string_agg(name, ', ') as agentes
FROM agents
GROUP BY group_name
ORDER BY group_name;
