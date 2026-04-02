## Migration SQL (atualizar a existente)
1. Criar tabela `municipios` com RLS
2. Inserir **Aparecida de Goiânia** e **Goiânia**
3. Adicionar `municipio_id` em suplentes, liderancas, administrativo, usuarios
4. Vincular TODOS os registros existentes a **Aparecida de Goiânia**
5. Criar tabela `suplente_municipio`

## Frontend
1. Atualizar migration SQL para incluir Aparecida como padrão
2. Nos formulários, pré-selecionar Aparecida de Goiânia como cidade padrão
3. Na página Index, adicionar seletor de cidade antes de redirecionar (ou no Dashboard)
