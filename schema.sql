-- =============================================================
-- CREDENCIAMENTO WL ATACADISTA · DS TecnoFisio
-- Execute este script no Supabase: SQL Editor > New query > Run
-- =============================================================

create table public.inscritos (
  id          uuid primary key default gen_random_uuid(),
  codigo      text unique not null,
  nome        text not null,
  telefone    text not null,
  profissao   text not null,
  email       text not null,
  presente    boolean not null default false,
  hora_entrada timestamptz,
  origem      text not null default 'online',  -- 'online' ou 'porta'
  criado_em   timestamptz not null default now()
);

-- Segurança em nível de linha (RLS)
alter table public.inscritos enable row level security;

-- O público (link de divulgação) só consegue SE INSCREVER.
-- Nunca consegue ler, alterar ou apagar a base.
create policy "inscricao_publica"
  on public.inscritos for insert
  to anon
  with check (origem = 'online' and presente = false);

-- A equipe logada (recepção/organização) gerencia tudo.
create policy "gestao_ler"
  on public.inscritos for select
  to authenticated using (true);

create policy "gestao_inserir"
  on public.inscritos for insert
  to authenticated with check (true);

create policy "gestao_atualizar"
  on public.inscritos for update
  to authenticated using (true);

-- Índices para busca rápida na recepção
create index idx_inscritos_codigo on public.inscritos (codigo);
create index idx_inscritos_nome on public.inscritos (lower(nome));

-- Realtime para o painel (Fase 6)
alter publication supabase_realtime add table public.inscritos;

-- =============================================================
-- Views do painel (Fase 6). `security_invoker` faz as views
-- respeitarem a RLS: só a equipe logada consegue ler.
-- Pode ser reexecutado à vontade (create or replace).
-- =============================================================
create or replace view public.painel_resumo
  with (security_invoker = true) as
select
  count(*)::int                                   as total,
  count(*) filter (where presente)::int           as presentes,
  count(*) filter (where origem = 'porta')::int   as porta
from public.inscritos;

create or replace view public.painel_profissoes
  with (security_invoker = true) as
select
  profissao,
  count(*)::int                          as total,
  count(*) filter (where presente)::int  as presentes
from public.inscritos
group by profissao
order by total desc, profissao;

-- =============================================================
-- Sincronização incremental (recepção consulta só o que mudou).
-- `atualizado_em` é mantido por gatilho a cada UPDATE.
-- Pode ser reexecutado à vontade.
-- =============================================================
alter table public.inscritos
  add column if not exists atualizado_em timestamptz not null default now();

create or replace function public.marcar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists trg_inscritos_atualizado_em on public.inscritos;
create trigger trg_inscritos_atualizado_em
  before update on public.inscritos
  for each row execute function public.marcar_atualizado_em();

create index if not exists idx_inscritos_atualizado_em on public.inscritos (atualizado_em);
