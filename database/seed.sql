-- Example seed data
INSERT INTO operators (id, organization_id, email, role, status) VALUES
  ('op_admin_demo','org_demo','admin@executia.local','admin','active')
ON CONFLICT (id) DO NOTHING;
