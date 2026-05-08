-- EXECUTIA Governance Layer V2
-- Deterministic institutional governance model

create extension if not exists pgcrypto;

--------------------------------------------------
-- ORGANIZATIONS
--------------------------------------------------

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  organization_code text unique not null,
  organization_name text not null,
  organization_type text not null,
  jurisdiction text,
  active boolean default true,
  created_at timestamptz default now()
);

--------------------------------------------------
-- AUTHORITIES
--------------------------------------------------

create table if not exists authorities (
  id uuid primary key default gen_random_uuid(),
  authority_code text unique not null,
  authority_name text not null,
  authority_level integer default 1,
  active boolean default true,
  created_at timestamptz default now()
);

--------------------------------------------------
-- ORGANIZATION MEMBERS
--------------------------------------------------

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id text not null,
  email text,
  authority_id uuid references authorities(id),
  active boolean default true,
  created_at timestamptz default now()
);

--------------------------------------------------
-- AUTHORITY SCOPES
--------------------------------------------------

create table if not exists authority_scopes (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid references authorities(id) on delete cascade,
  scope_code text not null,
  description text,
  created_at timestamptz default now()
);

--------------------------------------------------
-- POLICY RULES
--------------------------------------------------

create table if not exists policy_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  rule_code text not null,
  rule_type text not null,
  rule_definition jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

--------------------------------------------------
-- EXECUTION PERMISSIONS
--------------------------------------------------

create table if not exists execution_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  authority_id uuid references authorities(id) on delete cascade,
  request_type text not null,
  allowed boolean default true,
  risk_limit numeric default 0,
  created_at timestamptz default now()
);

--------------------------------------------------
-- DELEGATED EXECUTION
--------------------------------------------------

create table if not exists delegated_execution (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  delegated_by text not null,
  delegated_to text not null,
  authority_id uuid references authorities(id),
  scope jsonb default '{}'::jsonb,
  valid_until timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

--------------------------------------------------
-- JURISDICTIONS
--------------------------------------------------

create table if not exists jurisdictions (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_code text unique not null,
  jurisdiction_name text not null,
  regulatory_level text,
  active boolean default true,
  created_at timestamptz default now()
);

--------------------------------------------------
-- INDEXES
--------------------------------------------------

create index if not exists idx_org_members_org
on organization_members(organization_id);

create index if not exists idx_policy_rules_org
on policy_rules(organization_id);

create index if not exists idx_execution_permissions_org
on execution_permissions(organization_id);

