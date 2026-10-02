// ==============================================================================
// SISGED — dados iniciais FICTÍCIOS para demonstração
// Nenhum nome, e-mail ou senha aqui pertence a pessoas reais.
// Estes dados são gravados no localStorage do navegador na primeira visita.
// ==============================================================================
(function () {
  'use strict';

  const pad2 = n => String(n).padStart(2, '0');

  const turmas = [
    { id: 1,  codigo: 'DS-24',  nome: 'Dev. de Sistemas' },
    { id: 2,  codigo: 'GEI-12', nome: 'Gestão Industrial' },
    { id: 3,  codigo: 'MOS-04', nome: 'Modelagem de Sistemas' },
    { id: 4,  codigo: 'MMA-03', nome: 'Manut. Automóveis' },
    { id: 5,  codigo: 'PCI-02', nome: 'Assistente de Estilo' },
    { id: 6,  codigo: 'FPF-01', nome: 'Fundamentos de Física' },
    { id: 7,  codigo: 'VES-05', nome: 'Técnico em Vestuário' },
    { id: 8,  codigo: 'MD-01',  nome: 'Manut. Máq. Pesadas' },
    { id: 9,  codigo: 'FQ-01',  nome: 'Fundamentos de Química' },
    { id: 10, codigo: 'SST-01', nome: 'Segurança do Trabalho' }
  ];

  // Instrutores fictícios: ids 2 a 10 (o id 1 é o administrador de demonstração)
  const usuarios = [
    { id: 1, nome: 'Administrador Demo', email: 'admin@example.com', tipo: 'coordenador', ativo: 1 }
  ];
  for (let i = 1; i <= 9; i++) {
    usuarios.push({ id: 1 + i, nome: `Instrutor Demo ${pad2(i)}`, email: `instrutor${pad2(i)}@example.com`, tipo: 'instrutor', ativo: 1 });
  }
  for (let i = 1; i <= 12; i++) {
    usuarios.push({ id: 10 + i, nome: `Aluno Demo ${pad2(i)}`, email: `aluno${pad2(i)}@example.com`, tipo: 'aluno', ativo: 1 });
  }

  // dia_semana: 0=Segunda ... 5=Sábado | instrutor_id aponta para usuarios[]
  const aulas = [
    { id: 1,  turma_id: 1,  dia_semana: 0, turno: 'manha', sala: '102 D',   status: 'confirmada', instrutor_id: 2 },
    { id: 2,  turma_id: 2,  dia_semana: 0, turno: 'tarde', sala: '214 C',   status: 'confirmada', instrutor_id: 3 },
    { id: 3,  turma_id: 3,  dia_semana: 0, turno: 'noite', sala: 'TF4',     status: 'reposicao',  instrutor_id: 2 },
    { id: 4,  turma_id: 4,  dia_semana: 1, turno: 'manha', sala: '119 A',   status: 'confirmada', instrutor_id: 4 },
    { id: 5,  turma_id: 5,  dia_semana: 1, turno: 'manha', sala: '225 C',   status: 'confirmada', instrutor_id: 5 },
    { id: 6,  turma_id: 2,  dia_semana: 1, turno: 'tarde', sala: '214 C',   status: 'cancelada',  instrutor_id: 3 },
    { id: 7,  turma_id: 1,  dia_semana: 2, turno: 'manha', sala: '102 D',   status: 'confirmada', instrutor_id: 2 },
    { id: 8,  turma_id: 6,  dia_semana: 2, turno: 'manha', sala: '216 C',   status: 'confirmada', instrutor_id: 6 },
    { id: 9,  turma_id: 3,  dia_semana: 2, turno: 'tarde', sala: 'TF4',     status: 'confirmada', instrutor_id: 2 },
    { id: 10, turma_id: 7,  dia_semana: 2, turno: 'noite', sala: '224 C',   status: 'confirmada', instrutor_id: 10 },
    { id: 11, turma_id: 8,  dia_semana: 3, turno: 'manha', sala: '107 B',   status: 'confirmada', instrutor_id: 7 },
    { id: 12, turma_id: 9,  dia_semana: 3, turno: 'tarde', sala: '210 C',   status: 'confirmada', instrutor_id: 8 },
    { id: 13, turma_id: 3,  dia_semana: 3, turno: 'noite', sala: 'TF4',     status: 'reposicao',  instrutor_id: 2 },
    { id: 14, turma_id: 10, dia_semana: 4, turno: 'tarde', sala: '15'   , status: 'confirmada', instrutor_id: 9 },
    { id: 15, turma_id: 3,  dia_semana: 4, turno: 'noite', sala: 'TF4',     status: 'confirmada', instrutor_id: 2 },
    { id: 16, turma_id: 1,  dia_semana: 5, turno: 'manha', sala: '102 D',   status: 'confirmada', instrutor_id: 2 },
    { id: 17, turma_id: 3,  dia_semana: 5, turno: 'tarde', sala: 'TF4',     status: 'confirmada', instrutor_id: 2 }
  ].map(a => Object.assign({ horas_aula: 4, data_inicio: null, data_fim: null }, a));

  // [aluno_id, turma_id, frequência %]
  const matriculas = [
    [11, 1, 96], [12, 1, 88], [13, 1, 61],
    [14, 2, 92], [15, 2, 79],
    [16, 4, 85], [17, 4, 70],
    [18, 5, 98], [19, 7, 55],
    [20, 3, 90], [21, 3, 83],
    [22, 10, 100]
  ].map(([aluno_id, turma_id, frequencia]) => ({ aluno_id, turma_id, frequencia }));

  window.DADOS_INICIAIS = { turmas, usuarios, aulas, matriculas };
})();
