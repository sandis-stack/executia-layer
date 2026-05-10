-- =========================================
-- EXECUTIA GOVERNANCE FREEZE LAYER
-- =========================================

create table if not exists governance_freezes (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,

    review_id uuid,
    execution_id uuid,

    freeze_scope text not null default 'EXECUTION',

    freeze_reason text not null,

    freeze_level text not null default 'L1',

    status text not null default 'ACTIVE',

    created_by uuid,
    created_by_email text,

    released_by uuid,
    released_by_email text,

    created_at timestamptz not null default now(),
    released_at timestamptz,

    metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_governance_freezes_org
on governance_freezes(organization_id);

create index if not exists idx_governance_freezes_review
on governance_freezes(review_id);

create index if not exists idx_governance_freezes_execution
on governance_freezes(execution_id);

create index if not exists idx_governance_freezes_status
on governance_freezes(status);

-- =========================================
-- FREEZE EVENTS
-- =========================================

create table if not exists governance_freeze_events (
    id uuid primary key default gen_random_uuid(),

    freeze_id uuid not null references governance_freezes(id)
    on delete cascade,

    organization_id uuid not null,

    event_type text not null,

    actor_id uuid,
    actor_email text,

    details jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);

create index if not exists idx_governance_freeze_events_freeze
on governance_freeze_events(freeze_id);

-- =========================================
-- VALID STATUS CONSTRAINT
-- =========================================

alter table governance_freezes
drop constraint if exists governance_freezes_status_check;

alter table governance_freezes
add constraint governance_freezes_status_check
check (
    status in (
        'ACTIVE',
        'RELEASED',
        'EXPIRED'
    )
);

-- =========================================
-- VALID FREEZE LEVELS
-- =========================================

alter table governance_freezes
drop constraint if exists governance_freezes_level_check;

alter table governance_freezes
add constraint governance_freezes_level_check
check (
    freeze_level in (
        'L1',
        'L2',
        'L3',
        'EMERGENCY'
    )
);

-- =========================================
-- VALID SCOPES
-- =========================================

alter table governance_freezes
drop constraint if exists governance_freezes_scope_check;

alter table governance_freezes
add constraint governance_freezes_scope_check
check (
    freeze_scope in (
        'EXECUTION',
        'REVIEW',
        'ORGANIZATION',
        'SYSTEM'
    )
);
