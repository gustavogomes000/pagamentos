## Plano de Implementação — Sistema Multi-Municípios

### 1. Banco de Dados (Migrations)
- Criar função `eh_super_admin()` (wrapper para `has_role('admin')`)
- Criar tabela `municipios` com RLS
- Criar tabela `suplente_municipio` (N:N) com RLS
- Adicionar coluna `municipio_id` nas tabelas: `suplentes`, `liderancas`, `administrativo`, `usuarios`
- Inserir "Goiânia" como cidade padrão

### 2. Context React — `CidadeContext`
- Busca todos os municípios do Supabase
- Mantém `cidadeAtiva` (cidade selecionada)
- Opção "Todas as Cidades" para admin
- Persiste seleção no localStorage
- Provê função de filtro para queries

### 3. Componente `SeletorCidade`
- Dropdown compacto no header com ícone MapPin
- Lista todas as cidades + "Todas as Cidades" (admin)
- Ao trocar, invalida queries para refiltrar

### 4. Filtro em todas as queries
- Páginas afetadas: `Cadastros`, `Cadastro`, `ListaLiderancas`, `CadastroLideranca`, `ListaAdmin`, `CadastroAdmin`, `Pagamentos`, `Dashboard`
- Se cidade selecionada → `.eq("municipio_id", cidadeId)`
- Se "Todas" → sem filtro
- Novos registros salvam `municipio_id` da cidade ativa

### 5. Página Admin — Gerenciar Cidades
- Nova rota `/cidades`
- Listar cidades com contagem de registros
- Adicionar/editar/ativar/desativar cidades
- Acessível via menu "Mais"

### 6. Usuários por Cidade
- Campo cidade no cadastro de usuários
- Vincular `municipio_id` ao usuário

### Arquivos novos:
- `src/contexts/CidadeContext.tsx`
- `src/components/SeletorCidade.tsx`
- `src/pages/GerenciarCidades.tsx`

### Arquivos modificados:
- `src/App.tsx` (context provider + nova rota)
- `src/components/Layout.tsx` (seletor no header)
- `src/components/BottomNav.tsx` (link cidades no menu)
- Todas as páginas de listagem e cadastro
