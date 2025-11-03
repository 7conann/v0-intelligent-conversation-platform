-- Atribuir o agente "Diretor Comercial = Visão E+I" ao grupo "6. Resultado"
UPDATE agents
SET group_name = '6. Resultado'
WHERE id = '69b748fb-344b-4b8f-8b4e-0222eded0358';

-- Verificar se foi atualizado
SELECT id, name, group_name, trigger 
FROM agents 
WHERE id = '69b748fb-344b-4b8f-8b4e-0222eded0358';
