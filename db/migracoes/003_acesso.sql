-- Login e permissões: senha (scrypt), sessões no banco, convites de uso único e trilha de acesso.

alter table usuarios
  add column senha_hash text,
  add column senha_definida_em timestamptz,
  add column ultimo_acesso timestamptz,
  add column tentativas_falhas int not null default 0,
  add column bloqueado_ate timestamptz;

create unique index usuarios_email_unico on usuarios (lower(email)) where email <> '';

-- O id é o SHA-256 do token do cookie: quem lê o banco não consegue se passar pelo usuário.
create table sessoes (
  id text primary key,
  usuario_id text not null references usuarios(id) on delete cascade,
  criada_em timestamptz not null default now(),
  expira_em timestamptz not null,
  ultimo_uso timestamptz not null default now(),
  ip text,
  agente text
);
create index sessoes_usuario on sessoes (usuario_id);

create table convites (
  token_hash text primary key,
  usuario_id text not null references usuarios(id) on delete cascade,
  finalidade text not null check (finalidade in ('primeiro-acesso', 'redefinir')),
  criado_por text references usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz
);
create index convites_usuario on convites (usuario_id);

create table auditoria_acesso (
  id bigserial primary key,
  usuario_id text references usuarios(id) on delete set null,
  email text,
  evento text not null,
  ip text,
  criado_em timestamptz not null default now(),
  detalhes jsonb not null default '{}'
);
create index auditoria_acesso_ip on auditoria_acesso (evento, ip, criado_em desc);
create index auditoria_acesso_usuario on auditoria_acesso (usuario_id, criado_em desc);
