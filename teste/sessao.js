// ==============================================================================
// SISGED — sessão e perfis na página do sistema (pages/grade.html)
// Roda ANTES do script.js: valida o login simulado, remove da página o que o
// perfil não pode ver e preenche o cabeçalho com os dados do usuário.
//
// ATENÇÃO: isto controla apenas a exibição (demonstração). Em um sistema real,
// permissões precisam ser verificadas no servidor.
// ==============================================================================
(function () {
  'use strict';

  const sessao = ApiSimulada.sessaoAtual();
  if (!sessao) {
    window.location.replace('../index.html');
    return;
  }

  window.PAVUNA_SESSAO = { nome: sessao.nome, tipo: sessao.tipo, rotulo: sessao.rotulo };

  // Remove blocos que o perfil atual não pode ver (equivale aos antigos "if" do PHP)
  document.querySelectorAll('[data-perfis]').forEach(el => {
    const permitidos = el.dataset.perfis.split(',').map(p => p.trim());
    if (!permitidos.includes(sessao.tipo)) el.remove();
  });

  // Cabeçalho / menu da conta
  const iniciais = sessao.nome.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
  const definir = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
  definir('perfilIniciais', iniciais);
  definir('perfilNomeMenu', sessao.nome);
  definir('perfilTipoMenu', sessao.rotulo);
  const btnPerfil = document.getElementById('perfilBtn');
  if (btnPerfil) btnPerfil.setAttribute('aria-label', 'Menu da conta de ' + sessao.nome);

  // Sair do sistema
  document.querySelectorAll('.js-sair').forEach(a => a.addEventListener('click', () => ApiSimulada.encerrarSessao()));

  // Voltar pelo histórico depois de sair não deve reabrir o sistema
  window.addEventListener('pageshow', e => {
    if (e.persisted && !ApiSimulada.sessaoAtual()) window.location.replace('../index.html');
  });
})();
