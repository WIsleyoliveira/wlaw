-- Captura automática: DJEN (intimações públicas) e MNI 2.2.2 (processos via certificado).

-- Uma linha por alvo monitorado (OAB no DJEN, processo ou caixa de avisos no MNI).
-- Guarda frescor, falhas seguidas e pausa do disjuntor.
create table captura_estado (
  fonte text not null check (fonte in ('djen', 'mni')),
  alvo text not null,
  descricao text not null default '',
  ativo boolean not null default true,
  ultimo_sucesso timestamptz,
  ultima_tentativa timestamptz,
  falhas_seguidas int not null default 0,
  pausado_ate timestamptz,
  ultimo_erro text,
  cursor jsonb not null default '{}',
  primary key (fonte, alvo)
);

create table captura_execucoes (
  id bigserial primary key,
  fonte text not null,
  alvo text not null,
  iniciado_em timestamptz not null default now(),
  terminado_em timestamptz,
  status text not null check (status in ('rodando', 'sucesso', 'falha')),
  itens_lidos int not null default 0,
  itens_novos int not null default 0,
  requisicoes int not null default 0,
  erro text,
  detalhes jsonb not null default '{}'
);
create index captura_execucoes_recentes on captura_execucoes (fonte, alvo, iniciado_em desc);

create table djen_comunicacoes (
  id bigint primary key,
  hash text not null unique,
  numero_processo text not null,
  sigla_tribunal text not null default '',
  orgao text not null default '',
  tipo_comunicacao text not null default '',
  tipo_documento text not null default '',
  classe text not null default '',
  data_disponibilizacao date not null,
  texto text not null default '',
  link text,
  meio text,
  ativo boolean not null default true,
  motivo_cancelamento text,
  data_cancelamento timestamptz,
  destinatarios jsonb not null default '[]',
  advogados jsonb not null default '[]',
  oab_alvo text not null,
  processo_id text references processos(id) on delete set null,
  intimacao_id text references intimacoes(id) on delete set null,
  bruto jsonb not null,
  capturado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index djen_comunicacoes_processo on djen_comunicacoes (numero_processo);
create index djen_comunicacoes_data on djen_comunicacoes (data_disponibilizacao desc);

-- Certificados A1: arquivo e senha cifrados com AES-256-GCM pela chave mestra (fora do banco).
create table certificados (
  id text primary key,
  titular text not null,
  cpf text,
  emissor text not null default '',
  valido_de timestamptz not null,
  valido_ate timestamptz not null,
  impressao_digital text not null unique,
  pfx_cifrado bytea not null,
  senha_cifrada bytea not null,
  usuario_id text references usuarios(id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  ultimo_uso timestamptz
);

create table certificado_usos (
  id bigserial primary key,
  certificado_id text not null references certificados(id) on delete cascade,
  usado_em timestamptz not null default now(),
  operacao text not null,
  alvo text not null,
  sucesso boolean not null
);

create table mni_conectores (
  id text primary key,
  tribunal text not null,
  grau text not null,
  sistema text not null default 'PJe',
  url text not null,
  versao text not null default '2.2.2',
  modo text not null default 'simulado' check (modo in ('simulado', 'real')),
  certificado_id text references certificados(id) on delete set null,
  id_consultante text,
  senha_consultante_cifrada bytea,
  consultar_avisos boolean not null default true,
  ativo boolean not null default true,
  observacoes text not null default ''
);

alter table capturas
  add constraint capturas_conector_fk foreign key (conector_id) references mni_conectores(id) on delete set null;

-- Hashes do consultarAlteracao: só baixa o processo inteiro quando algo mudou.
create table mni_processos_estado (
  processo_id text not null references processos(id) on delete cascade,
  conector_id text not null references mni_conectores(id) on delete cascade,
  hash_cabecalho text,
  hash_movimentacoes text,
  hash_documentos text,
  verificado_em timestamptz,
  alterado_em timestamptz,
  primary key (processo_id, conector_id)
);

-- Avisos pendentes: o teor NÃO é aberto automaticamente (abrir pode registrar ciência).
create table mni_avisos (
  conector_id text not null references mni_conectores(id) on delete cascade,
  id_aviso text not null,
  numero_processo text not null,
  tipo_comunicacao text,
  data_disponibilizacao timestamptz,
  destinatario text,
  processo_id text references processos(id) on delete set null,
  intimacao_id text references intimacoes(id) on delete set null,
  teor_aberto_em timestamptz,
  bruto jsonb not null default '{}',
  capturado_em timestamptz not null default now(),
  primary key (conector_id, id_aviso)
);

-- Único endpoint conferido até agora (WSDL público respondeu em 14/09/2026).
insert into mni_conectores (id, tribunal, grau, url, observacoes)
values ('tjpa-1g', 'TJPA', '1º grau', 'https://pje.tjpa.jus.br/pje/intercomunicacao',
        'WSDL conferido. Autenticação real ainda não testada: sem certificado.')
on conflict do nothing;
