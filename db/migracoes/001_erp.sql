-- ERP: espelha os tipos de src/lib/tipos.ts. Datas de negócio seguem como texto dd/mm/aaaa,
-- como a interface já usa; os campos novos de captura usam timestamptz.

create table config (
  id int primary key default 1 check (id = 1),
  razao_social text not null default '',
  cnpj text not null default '',
  oab text not null default '',
  telefone text not null default '',
  endereco text not null default '',
  fuso text not null default '',
  primeiro_dia text not null default '',
  resumo_email text not null default '',
  antecedencia text not null default '',
  margem text not null default '',
  art220 text not null default '',
  modelo_ia text not null default ''
);

create table pessoas (
  id text primary key,
  seq bigint generated always as identity,
  nome text not null,
  tipo text not null,
  doc text not null default '',
  email text not null default '',
  telefone text not null default '',
  cidade text not null default '',
  cliente boolean not null default false,
  criado_em text
);

create table usuarios (
  id text primary key,
  seq bigint generated always as identity,
  nome text not null,
  email text not null default '',
  oab text not null default '',
  perfil text not null,
  grupos text[] not null default '{}',
  ativo boolean not null default true
);

create table processos (
  id text primary key,
  seq bigint generated always as identity,
  pasta text not null unique,
  numero text not null,
  titulo text not null,
  cliente_id text references pessoas(id),
  papel text not null,
  contraria text not null default '',
  tribunal text not null default '',
  orgao text not null default '',
  comarca text not null default '',
  instancia text not null default '',
  classe text not null default '',
  assunto text not null default '',
  juiz text not null default '',
  distribuido text not null default '',
  valor_causa double precision not null default 0,
  provisao double precision not null default 0,
  exito int not null default 50,
  fase text not null,
  fases text[],
  situacao text not null,
  responsaveis text[] not null default '{}',
  grupo text not null default '',
  marcadores text[] not null default '{}',
  monitorado boolean not null default false,
  observacoes text not null default '',
  resumo_ia jsonb,
  criado_em text
);
create index processos_numero_digitos on processos (regexp_replace(numero, '\D', '', 'g'));

create table atividades (
  id text primary key,
  seq bigint generated always as identity,
  identificador text not null,
  tipo text not null,
  descricao text not null default '',
  processo_id text references processos(id) on delete set null,
  prevista text not null default '',
  fatal text not null default '',
  responsavel text not null default '',
  situacao text not null,
  criado_em text
);

create table andamentos (
  id text primary key,
  seq bigint generated always as identity,
  data text not null,
  orgao text not null default '',
  tipo text not null,
  processo_id text references processos(id) on delete set null,
  descricao text not null default '',
  lido boolean not null default false,
  origem text not null default 'manual',
  identificador text,
  data_hora timestamptz,
  unique (processo_id, origem, identificador)
);

create table intimacoes (
  id text primary key,
  seq bigint generated always as identity,
  disponibilizacao text not null,
  publicacao text not null,
  numero text not null,
  processo_id text references processos(id) on delete set null,
  descricao text not null default '',
  situacao text not null,
  teor text not null default '',
  origem text not null default 'manual',
  chave_origem text unique,
  link text,
  cancelada_em timestamptz
);

create table capturas (
  id text primary key,
  seq bigint generated always as identity,
  data text not null,
  numero text not null,
  orgao text not null default '',
  instancia text not null default '',
  status text not null,
  conector_id text,
  processo_id text references processos(id) on delete cascade,
  ultima_verificacao timestamptz,
  mensagem text
);

create table contratos (
  id text primary key,
  seq bigint generated always as identity,
  titulo text not null,
  cliente_id text references pessoas(id),
  modalidade text not null default '',
  valor double precision not null default 0,
  inicio text not null default '',
  proxima text not null default '',
  situacao text not null
);

create table cobrancas (
  id text primary key,
  seq bigint generated always as identity,
  descricao text not null,
  cliente_id text references pessoas(id),
  vencimento text not null default '',
  valor double precision not null default 0,
  situacao text not null
);

create table contas_pagar (
  id text primary key,
  seq bigint generated always as identity,
  fornecedor text not null,
  categoria text not null default '',
  vencimento text not null default '',
  valor double precision not null default 0,
  situacao text not null
);

create table lancamentos (
  id text primary key,
  seq bigint generated always as identity,
  data text not null,
  minutos int not null default 0,
  faturavel boolean not null default true,
  responsavel text not null default '',
  processo_id text references processos(id) on delete set null,
  descricao text not null default ''
);

create table documentos (
  id text primary key,
  seq bigint generated always as identity,
  nome text not null,
  tipo text not null,
  processo_id text references processos(id) on delete set null,
  tamanho text not null default '',
  data text not null default '',
  autor text not null default ''
);

create table tipos_tarefa (
  id text primary key,
  seq bigint generated always as identity,
  nome text not null,
  cor text not null default '#71717a',
  prazo_padrao text not null default '',
  dias_uteis boolean not null default false
);

create table feriados (
  id text primary key,
  seq bigint generated always as identity,
  data text not null,
  nome text not null,
  tipo text not null default ''
);

create table atendimentos (
  id text primary key,
  seq bigint generated always as identity,
  data text not null,
  cliente_id text references pessoas(id),
  tipo text not null,
  assunto text not null default '',
  responsavel text not null default '',
  processo_id text references processos(id) on delete set null
);
