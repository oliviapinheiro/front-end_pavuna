# SISGED — Controle de Turmas & Instrutores (versão front-end estática)

MVP **exclusivamente front-end** (HTML + CSS + JavaScript puro), pronto para publicar no
**GitHub Pages** e no **Cloudflare Pages** sem build, sem servidor e sem banco de dados.

Esta versão deriva do projeto original *Pavuna Softwares* (PHP + MySQL). O backend foi
substituído por uma **API simulada em JavaScript** que guarda os dados no `localStorage`
do navegador. Todos os dados de exemplo são **fictícios**.

## Contas de demonstração (fictícias)

A tela de login (`index.html`) tem botões que preenchem as contas automaticamente.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `admin@example.com` | `demo12345` |
| Instrutor | `instrutor01@example.com` | `demo12345` |
| Aluno | `aluno01@example.com` | `demo12345` |

> São credenciais de **demonstração de uma simulação**, sem valor real, e existem só para
> permitir testar os três perfis. Não reutilize essa senha em nenhum serviço verdadeiro.

## Estrutura de pastas

```
index.html                 # página inicial (login)
pages/
  grade.html               # sistema: grade, instrutores, alunos, relatórios, cadastros
  cadastro.html            # criar conta de administrador (simulado)
  esqueci-senha.html       # recuperar senha (simulado: o "e-mail" é um link na tela)
  redefinir-senha.html     # criar nova senha a partir do link
css/
  style.css                # estilos do sistema
  auth.css                 # estilos das telas de acesso
js/
  dados-iniciais.js        # dados fictícios de partida
  api-simulada.js          # "backend" simulado (localStorage, regras e validações)
  auth.js                  # telas de login/cadastro/recuperação
  sessao.js                # guarda de sessão e exibição por perfil
  script.js                # lógica do sistema (grade, listas, relatórios)
img/
  senai-logo.png, sesi-logo.png
docs/
  MODELO_RELATORIO.md      # roteiro para o relatório técnico e tabela comparativa
.nojekyll                  # evita processamento Jekyll no GitHub Pages
```

Todos os caminhos são **relativos** (`css/…`, `../js/…`), então o site funciona em
`https://usuario.github.io/repositorio/` (subcaminho) e na raiz de `*.pages.dev`.

## Rodar localmente

Abra com um servidor estático (evita restrições de `file://`):

```bash
python3 -m http.server 8000      # depois acesse http://localhost:8000/
```

## O que mudou em relação ao projeto original

| Original (PHP/MySQL) | Esta versão (estática) |
| --- | --- |
| `index.php` com `if` de permissão em PHP | `pages/grade.html` + `js/sessao.js` (atributos `data-perfis`) |
| `api/*.php`, `auth/*.php` | rotas simuladas em `js/api-simulada.js` |
| MySQL (`database.sql`) | `localStorage` + `js/dados-iniciais.js` |
| Sessão PHP, token CSRF, `password_hash` | sessão no `localStorage`, hash SHA-256 com sal (apenas simulação) |
| E-mail de redefinição de senha | link exibido na própria tela |
| Exportar CSV no servidor | CSV gerado no navegador |
| `.env`, `config.php`, `.htaccess`, `storage/`, `uploads/` | **removidos** |

Correções feitas durante a conversão:

- Nomes, e-mails e hashes de pessoas do `database.sql` original foram **substituídos por dados fictícios**
  (regra do MVP: não publicar dados pessoais).
- `script.js` usava as constantes `TITULOS` e `NOME_SISTEMA` sem defini-las (erro ao trocar de aba); agora estão definidas.
- A ação "alterar status" do front usava um nome diferente do esperado pelo PHP; na simulação ambos funcionam.
- A grade passou a receber `horas_aula` (4 h por encontro, como no esquema do banco), o que torna a carga horária visível.
- `images.jpg` não era referenciada por nenhuma página e não foi incluída.

## Limitações da hospedagem estática

- Não executa PHP nem conecta a MySQL/MariaDB sem uma API/serviço intermediário.
- **Autenticação real exige backend.** Aqui, login, perfis e senhas são só uma simulação: o código é público e
  qualquer pessoa pode editar o `localStorage`. Não use para dados reais.
- Dados ficam apenas no navegador: não são compartilhados entre usuários nem entre dispositivos.
- Upload de arquivos e persistência compartilhada exigem infraestrutura adicional.
- Segredos (tokens, chaves, senhas de banco) **nunca** devem entrar em JavaScript público.

Caminhos de evolução: Supabase/Firebase (auth + banco), Cloudflare Workers + D1, ou uma API própria (PHP/Node) consumida via `fetch`.

## Dependências externas (opcionais)

- Google Fonts (Space Grotesk, Inter, IBM Plex Mono) — há fontes alternativas se não carregarem.
- VLibras (`vlibras.gov.br`) — widget de acessibilidade em Libras; o sistema funciona sem ele.

## Publicação

### 1. GitHub (repositório + commit)

```bash
git init
git add .
git commit -m "SISGED: primeira versão front-end estática"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sisged.git
git push -u origin main
```

### 2. GitHub Pages

1. No repositório: **Settings → Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Aguarde o deploy e copie o endereço (`https://SEU_USUARIO.github.io/sisged/`).

### 3. Cloudflare Pages

1. No painel da Cloudflare, abra **Workers & Pages** e crie um projeto **Pages** conectado ao Git.
2. Autorize a conta GitHub e selecione o repositório do SISGED.
3. Configuração: framework **None**, **build command** vazio, **output directory** `/` (raiz) ou em branco.
4. Faça o deploy e copie o endereço (`https://NOME.pages.dev`).

> Os nomes exatos dos menus podem mudar; siga a interface atual de cada plataforma.

## Checklist de testes (preencha só o que você executou)

- [ ] A página inicial abre corretamente
- [ ] Os estilos CSS são carregados
- [ ] Os scripts JavaScript são executados
- [ ] As imagens são exibidas
- [ ] Os menus e links internos funcionam
- [ ] Não existem erros críticos no console do navegador
- [ ] O layout se adapta a telas de diferentes tamanhos
- [ ] O projeto é acessível pelos dois endereços públicos
- [ ] Os recursos não dependem de caminhos absolutos do computador local

Veja `docs/MODELO_RELATORIO.md` para o roteiro do relatório e a tabela comparativa.
