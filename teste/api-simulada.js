// ==============================================================================
// SISGED — API SIMULADA (100% front-end)
//
// Substitui o backend PHP + MySQL do projeto original. Os "dados do servidor"
// ficam no localStorage do navegador, portanto:
//   • cada navegador/dispositivo tem a sua própria cópia dos dados;
//   • nada é enviado para a internet nem compartilhado entre usuários;
//   • as regras de perfil e a verificação de senha aqui são apenas SIMULAÇÃO
//     para demonstrar o fluxo — NÃO oferecem segurança real (o código é público).
//
// Uso: ApiSimulada.requisitar('aulas', { method: 'GET' }) -> Promise<Response>
// ==============================================================================
(function () {
  'use strict';

  const CHAVE_DB = 'sisged:db:v1';
  const CHAVE_SESSAO = 'sisged:sessao:v1';
  const LATENCIA_MS = 60;

  // Credenciais FICTÍCIAS de demonstração (mostradas na tela de login).
  const SENHA_DEMO = 'demo12345';
  const CONTAS_DEMO = [
    { rotulo: 'Administrador', email: 'admin@example.com' },
    { rotulo: 'Instrutor', email: 'instrutor01@example.com' },
    { rotulo: 'Aluno', email: 'aluno01@example.com' }
  ];

  const ROTULOS_TIPO = { coordenador: 'Administrador', instrutor: 'Instrutor', aluno: 'Aluno' };

  // ---------- armazenamento (localStorage com reserva em memória) ----------
  const memoria = {};
  const armazem = {
    ler(chave) {
      try { return window.localStorage.getItem(chave); } catch (e) { return memoria[chave] ?? null; }
    },
    gravar(chave, valor) {
      try { window.localStorage.setItem(chave, valor); } catch (e) { memoria[chave] = valor; }
    },
    apagar(chave) {
      try { window.localStorage.removeItem(chave); } catch (e) { delete memoria[chave]; }
    }
  };

  // ---------- SHA-256 simples (sem depender de contexto seguro/HTTPS) ----------
  const primos = [];
  for (let n = 2; primos.length < 64; n++) {
    if (primos.every(p => n % p !== 0)) primos.push(n);
  }
  const fracao32 = x => Math.floor((x - Math.floor(x)) * 4294967296);
  const K = primos.map(p => fracao32(Math.cbrt(p)));
  const H0 = primos.slice(0, 8).map(p => fracao32(Math.sqrt(p)));

  function sha256(texto) {
    const bytes = Array.from(new TextEncoder().encode(texto));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 0xff);
    const h = H0.slice();
    const w = new Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < bytes.length; off += 64) {
      for (let i = 0; i < 16; i++) {
        w[i] = (bytes[off + 4 * i] << 24) | (bytes[off + 4 * i + 1] << 16) | (bytes[off + 4 * i + 2] << 8) | bytes[off + 4 * i + 3];
      }
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  function aleatorioHex(bytes) {
    const buf = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(buf);
    else for (let i = 0; i < bytes; i++) buf[i] = Math.floor(Math.random() * 256);
    return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
  }

  const hashSenha = (senha, sal) => sha256(`${sal}:${senha}`);

  // ---------- banco de dados simulado ----------
  function criarBancoInicial() {
    const base = window.DADOS_INICIAIS;
    if (!base) throw new Error('dados-iniciais.js não foi carregado.');
    const usuarios = base.usuarios.map(u => {
      const sal = aleatorioHex(8);
      return { ...u, sal, hash: hashSenha(SENHA_DEMO, sal), criado_em: new Date().toISOString() };
    });
    return {
      turmas: base.turmas.map(t => ({ ...t })),
      usuarios,
      aulas: base.aulas.map(a => ({ ...a })),
      matriculas: base.matriculas.map(m => ({ ...m })),
      redefinicoes: [],
      proximo: {
        usuario: Math.max(...usuarios.map(u => u.id)) + 1,
        aula: Math.max(...base.aulas.map(a => a.id)) + 1
      }
    };
  }

  let cacheDb = null;
  function lerBanco() {
    if (cacheDb) return cacheDb;
    const bruto = armazem.ler(CHAVE_DB);
    if (bruto) {
      try { cacheDb = JSON.parse(bruto); return cacheDb; } catch (e) { /* dados corrompidos: recria */ }
    }
    cacheDb = criarBancoInicial();
    salvarBanco();
    return cacheDb;
  }
  function salvarBanco() { armazem.gravar(CHAVE_DB, JSON.stringify(cacheDb)); }

  // ---------- sessão ----------
  function sessaoAtual() {
    const bruto = armazem.ler(CHAVE_SESSAO);
    if (!bruto) return null;
    let s;
    try { s = JSON.parse(bruto); } catch (e) { return null; }
    const u = lerBanco().usuarios.find(x => x.id === s.id);
    if (!u || Number(u.ativo) === 0) return null;
    return { id: u.id, nome: u.nome, email: u.email, tipo: u.tipo, rotulo: ROTULOS_TIPO[u.tipo] || u.tipo };
  }
  function iniciarSessao(u) { armazem.gravar(CHAVE_SESSAO, JSON.stringify({ id: u.id, em: Date.now() })); }
  function encerrarSessao() { armazem.apagar(CHAVE_SESSAO); }

  function restaurarDemo() {
    cacheDb = criarBancoInicial();
    salvarBanco();
    encerrarSessao();
  }

  // ---------- validações (mesmas regras do backend original) ----------
  class ErroApi extends Error {
    constructor(status, mensagem) { super(mensagem); this.status = status; }
  }
  const erro = (status, msg) => { throw new ErroApi(status, msg); };

  function validarNome(v) {
    const nome = typeof v === 'string' ? v.trim() : '';
    if (nome.length < 2 || nome.length > 150) erro(422, 'Informe um nome entre 2 e 150 caracteres.');
    return nome;
  }
  function validarEmail(v) {
    const email = typeof v === 'string' ? v.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) erro(422, 'Informe um e-mail válido.');
    return email;
  }
  function validarSenha(v, minimo = 8) {
    const senha = typeof v === 'string' ? v : '';
    if (senha.length < minimo || senha.length > 255) erro(422, `A senha precisa ter entre ${minimo} e 255 caracteres.`);
    return senha;
  }
  function validarId(v, campo = 'Identificador') {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) erro(422, `${campo} inválido.`);
    return n;
  }

  function exigirLogin() {
    const s = sessaoAtual();
    if (!s) erro(401, 'Sessão expirada. Faça login novamente.');
    return s;
  }
  function exigirPerfil(perfis) {
    const s = exigirLogin();
    if (!perfis.includes(s.tipo)) erro(403, 'Seu perfil não tem acesso a este recurso.');
    return s;
  }

  // ---------- projeções (formato idêntico ao das antigas respostas JSON) ----------
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

  function listaInstrutores(db) {
    return db.usuarios.filter(u => u.tipo === 'instrutor').sort(porNome)
      .map(u => ({ id: u.id, nome: u.nome, email: u.email, ativo: Number(u.ativo) }));
  }
  function listaAlunos(db) {
    return db.usuarios.filter(u => u.tipo === 'aluno').sort(porNome).map(u => {
      const m = db.matriculas.find(x => x.aluno_id === u.id);
      const t = m ? db.turmas.find(x => x.id === m.turma_id) : null;
      return {
        id: u.id, nome: u.nome, email: u.email, ativo: Number(u.ativo),
        turma_id: t ? t.id : null, turma_codigo: t ? t.codigo : null, turma_nome: t ? t.nome : null,
        frequencia: m ? Number(m.frequencia) : null
      };
    });
  }
  function listaAulas(db) {
    return db.aulas.map(a => {
      const t = db.turmas.find(x => x.id === a.turma_id) || {};
      const u = a.instrutor_id ? db.usuarios.find(x => x.id === a.instrutor_id) : null;
      return {
        id: a.id, dia_semana: a.dia_semana, turno: a.turno, sala: a.sala, status: a.status,
        materia: a.materia || t.nome, horas_aula: a.horas_aula, data_inicio: a.data_inicio, data_fim: a.data_fim,
        turma_id: t.id, turma_codigo: t.codigo, turma_nome: t.nome,
        instrutor_id: u ? u.id : null, instrutor_nome: u ? u.nome : null
      };
    }).sort((x, y) => x.dia_semana - y.dia_semana || ['manha', 'tarde', 'noite'].indexOf(x.turno) - ['manha', 'tarde', 'noite'].indexOf(y.turno));
  }
  const listaTurmas = db => db.turmas.slice().sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }));

  function removerUsuario(db, id) {
    db.usuarios = db.usuarios.filter(u => u.id !== id);
    db.matriculas = db.matriculas.filter(m => m.aluno_id !== id);
    db.redefinicoes = db.redefinicoes.filter(r => r.usuario_id !== id);
    db.aulas.forEach(a => { if (a.instrutor_id === id) a.instrutor_id = null; });
  }

  // ---------- rotas ----------
  const corpoJSON = opcoes => {
    try { return opcoes && typeof opcoes.body === 'string' ? JSON.parse(opcoes.body) : {}; } catch (e) { return {}; }
  };

  const rotas = {
    // ----- autenticação -----
    login(metodo, params, opcoes) {
      if (metodo !== 'POST') erro(405, 'Método não permitido.');
      const dados = corpoJSON(opcoes);
      const email = validarEmail(dados.email);
      const senha = typeof dados.senha === 'string' ? dados.senha : '';
      if (senha === '') erro(422, 'Informe e-mail e senha.');
      const db = lerBanco();
      const u = db.usuarios.find(x => x.email === email);
      if (!u || u.hash !== hashSenha(senha, u.sal)) erro(401, 'E-mail ou senha incorretos.');
      if (Number(u.ativo) === 0) erro(403, 'Este cadastro está desativado. Procure a coordenação.');
      iniciarSessao(u);
      return { sucesso: true, usuario: { nome: u.nome, tipo: u.tipo } };
    },

    cadastro(metodo, params, opcoes) {
      if (metodo !== 'POST') erro(405, 'Método não permitido.');
      const dados = corpoJSON(opcoes);
      const nome = validarNome(dados.nome);
      const email = validarEmail(dados.email);
      const senha = validarSenha(dados.senha);
      if (dados.tipo !== 'coordenador') erro(422, 'Tipo de conta inválido.');
      const db = lerBanco();
      if (db.usuarios.some(u => u.email === email)) erro(409, 'Já existe uma conta com esse e-mail.');
      const sal = aleatorioHex(8);
      db.usuarios.push({ id: db.proximo.usuario++, nome, email, tipo: 'coordenador', ativo: 1, sal, hash: hashSenha(senha, sal), criado_em: new Date().toISOString() });
      salvarBanco();
      return { sucesso: true };
    },

    'esqueci-senha'(metodo, params, opcoes) {
      if (metodo !== 'POST') erro(405, 'Método não permitido.');
      const email = validarEmail(corpoJSON(opcoes).email);
      const db = lerBanco();
      const resposta = { sucesso: true, mensagem: 'Se o e-mail estiver cadastrado, o link de redefinição será gerado. O link vale por 1 hora.' };
      const u = db.usuarios.find(x => x.email === email);
      if (u) {
        const agora = Date.now();
        db.redefinicoes = db.redefinicoes.filter(r => r.expira_em > agora && !r.usado);
        const token = aleatorioHex(32); // 64 caracteres hexadecimais
        db.redefinicoes.push({ usuario_id: u.id, token_hash: sha256(token), expira_em: agora + 60 * 60 * 1000, usado: false });
        salvarBanco();
        // SIMULAÇÃO: não existe servidor de e-mail, então o token é devolvido à tela.
        resposta.token_simulado = token;
      }
      return resposta;
    },

    'redefinir-senha'(metodo, params, opcoes) {
      if (metodo !== 'POST') erro(405, 'Método não permitido.');
      const dados = corpoJSON(opcoes);
      const nova = validarSenha(dados.nova_senha);
      const token = typeof dados.token === 'string' ? dados.token : '';
      if (!/^[a-f0-9]{64}$/.test(token)) erro(400, 'Link inválido ou expirado. Peça um novo link.');
      const db = lerBanco();
      const r = db.redefinicoes.find(x => x.token_hash === sha256(token) && !x.usado && x.expira_em > Date.now());
      if (!r) erro(400, 'Link inválido ou expirado. Peça um novo link.');
      const u = db.usuarios.find(x => x.id === r.usuario_id);
      if (!u) erro(400, 'Link inválido ou expirado. Peça um novo link.');
      u.sal = aleatorioHex(8);
      u.hash = hashSenha(nova, u.sal);
      r.usado = true;
      salvarBanco();
      return { sucesso: true, mensagem: 'Senha redefinida com sucesso! Redirecionando para o login...' };
    },

    'alterar-senha'(metodo, params, opcoes) {
      if (metodo !== 'POST') erro(405, 'Método não permitido.');
      const s = exigirLogin();
      const dados = corpoJSON(opcoes);
      const nova = validarSenha(dados.nova_senha);
      const db = lerBanco();
      const u = db.usuarios.find(x => x.id === s.id);
      if (!u || u.hash !== hashSenha(typeof dados.senha_atual === 'string' ? dados.senha_atual : '', u.sal)) erro(403, 'A senha atual está incorreta.');
      u.sal = aleatorioHex(8);
      u.hash = hashSenha(nova, u.sal);
      salvarBanco();
      return { sucesso: true };
    },

    // ----- dados da aplicação -----
    aulas(metodo) {
      if (metodo !== 'GET') erro(405, 'Método não permitido.');
      exigirLogin();
      const db = lerBanco();
      return { turmas: listaTurmas(db), aulas: listaAulas(db) };
    },

    turmas(metodo) {
      if (metodo !== 'GET') erro(405, 'Método não permitido.');
      exigirLogin();
      return listaTurmas(lerBanco());
    },

    instrutores(metodo, params, opcoes) {
      const db = lerBanco();
      if (metodo === 'GET') {
        exigirPerfil(['coordenador', 'instrutor']);
        return listaInstrutores(db);
      }
      if (metodo === 'POST') {
        exigirPerfil(['coordenador']);
        const dados = corpoJSON(opcoes);
        const nome = validarNome(dados.nome);
        const email = validarEmail(dados.email);
        const senha = validarSenha(dados.senha);
        if (db.usuarios.some(u => u.email === email)) erro(409, 'Já existe uma conta com esse e-mail.');
        const sal = aleatorioHex(8);
        const id = db.proximo.usuario++;
        db.usuarios.push({ id, nome, email, tipo: 'instrutor', ativo: 1, sal, hash: hashSenha(senha, sal), criado_em: new Date().toISOString() });
        salvarBanco();
        return { sucesso: true, id };
      }
      return erro(405, 'Método não permitido.');
    },

    alunos(metodo, params, opcoes) {
      const db = lerBanco();
      if (metodo === 'GET') {
        exigirPerfil(['coordenador', 'instrutor']);
        return listaAlunos(db);
      }
      if (metodo === 'POST') {
        exigirPerfil(['coordenador', 'instrutor']);
        const dados = corpoJSON(opcoes);
        const nome = validarNome(dados.nome);
        const email = validarEmail(dados.email);
        const senha = validarSenha(dados.senha);
        const turmaId = dados.turma_id ? validarId(dados.turma_id, 'Turma') : null;
        if (db.usuarios.some(u => u.email === email)) erro(409, 'Já existe uma conta com esse e-mail.');
        if (turmaId !== null && !db.turmas.some(t => t.id === turmaId)) erro(422, 'A turma selecionada não existe.');
        const sal = aleatorioHex(8);
        const id = db.proximo.usuario++;
        db.usuarios.push({ id, nome, email, tipo: 'aluno', ativo: 1, sal, hash: hashSenha(senha, sal), criado_em: new Date().toISOString() });
        if (turmaId !== null) db.matriculas.push({ aluno_id: id, turma_id: turmaId, frequencia: 100 });
        salvarBanco();
        return { sucesso: true, id };
      }
      return erro(405, 'Método não permitido.');
    },

    'relatorio-instrutor'(metodo, params) {
      if (metodo !== 'GET') erro(405, 'Método não permitido.');
      const s = exigirLogin();
      let instrutorId = params.get('instrutor_id');
      if (s.tipo === 'instrutor') instrutorId = s.id;
      else if (s.tipo !== 'coordenador') erro(403, 'Seu perfil não tem acesso a relatórios.');
      if (!instrutorId) erro(422, 'Selecione um instrutor.');
      instrutorId = validarId(instrutorId, 'Instrutor');
      const db = lerBanco();
      const instrutor = db.usuarios.find(u => u.id === instrutorId && u.tipo === 'instrutor');
      if (!instrutor) erro(404, 'Instrutor não encontrado.');
      const aulas = listaAulas(db).filter(a => a.instrutor_id === instrutorId)
        .map(a => ({ dia_semana: a.dia_semana, turno: a.turno, sala: a.sala, status: a.status, turma_codigo: a.turma_codigo, turma_nome: a.turma_nome }));
      const resumo = { confirmada: 0, reposicao: 0, cancelada: 0 };
      aulas.forEach(a => { resumo[a.status] = (resumo[a.status] || 0) + 1; });
      return { instrutor: instrutor.nome, resumo, aulas, total: aulas.length };
    },

    // ----- ações administrativas (antes: POST em index.php) -----
    acoes(metodo, params, opcoes) {
      if (metodo !== 'POST') erro(405, 'Método não permitido.');
      const s = exigirLogin();
      const fd = opcoes && opcoes.body;
      const campo = nome => (fd && typeof fd.get === 'function' ? fd.get(nome) : null);
      const acao = campo('acao');
      const db = lerBanco();

      if (acao === 'deletar_instrutor' || acao === 'deletar_aluno') {
        const tipoAlvo = acao === 'deletar_instrutor' ? 'instrutor' : 'aluno';
        if (s.tipo !== 'coordenador') {
          return { success: false, message: `Acesso negado: apenas administradores podem excluir ${tipoAlvo === 'instrutor' ? 'instrutores' : 'alunos'}.` };
        }
        const id = validarId(campo('id'), 'Cadastro');
        const alvo = db.usuarios.find(u => u.id === id && u.tipo === tipoAlvo);
        if (!alvo) return { success: false, message: 'Cadastro não encontrado ou já excluído.' };
        removerUsuario(db, id);
        salvarBanco();
        return { success: true, message: `${tipoAlvo === 'instrutor' ? 'Instrutor' : 'Aluno'} excluído com sucesso.` };
      }

      if (acao === 'alterar_status_usuario' || acao === 'alterar_status') {
        if (s.tipo !== 'coordenador') return { success: false, message: 'Acesso negado: apenas administradores podem alterar o status.' };
        const id = Number(campo('id'));
        const tipoAlvo = campo('tipo');
        const novoAtivo = campo('ativo') === '1' ? 1 : 0;
        if (!Number.isInteger(id) || id < 1 || !['instrutor', 'aluno'].includes(tipoAlvo)) {
          return { success: false, message: 'Selecione um cadastro válido.' };
        }
        const alvo = db.usuarios.find(u => u.id === id && u.tipo === tipoAlvo);
        if (!alvo) return { success: false, message: 'Cadastro não encontrado.' };
        alvo.ativo = novoAtivo;
        salvarBanco();
        return { success: true, ativo: novoAtivo, message: novoAtivo ? 'Cadastro reativado com sucesso.' : 'Cadastro desativado com sucesso.' };
      }

      return { success: false, message: 'Ação desconhecida.' };
    }
  };

  // ---------- ponto de entrada: imita fetch(), devolvendo um Response ----------
  function montarResposta(status, corpo) {
    return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }

  async function requisitar(rota, opcoes = {}) {
    await new Promise(r => setTimeout(r, LATENCIA_MS));
    const [caminho, consulta = ''] = String(rota).split('?');
    const params = new URLSearchParams(consulta);
    const metodo = String(opcoes.method || 'GET').toUpperCase();
    const tratador = rotas[caminho];
    if (!tratador) return montarResposta(404, { erro: 'Recurso não encontrado.' });
    try {
      return montarResposta(200, tratador(metodo, params, opcoes));
    } catch (e) {
      if (e instanceof ErroApi) return montarResposta(e.status, { erro: e.message, message: e.message });
      console.error('[SISGED] erro inesperado na API simulada:', e);
      return montarResposta(500, { erro: 'Erro inesperado na simulação. Tente restaurar os dados de demonstração.' });
    }
  }

  window.ApiSimulada = { requisitar, sessaoAtual, encerrarSessao, restaurarDemo, CONTAS_DEMO, SENHA_DEMO, ROTULOS_TIPO, _sha256: sha256 };
})();
