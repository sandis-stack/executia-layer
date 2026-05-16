alter table execution_requests
add column if not exists execution_complexity text default 'UNCLASSIFIED',
add column if not exists governance_risk text default 'UNCLASSIFIED',
add column if not exists drift_risk text default 'UNCLASSIFIED',
add column if not exists compliance_intensity text default 'UNCLASSIFIED',
add column if not exists execution_layer_count int default 0,
add column if not exists estimated_savings text default 'UNCLASSIFIED';
