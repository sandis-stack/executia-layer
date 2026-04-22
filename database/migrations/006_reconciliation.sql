CREATE OR REPLACE VIEW pending_reconciliation AS
SELECT er.*
FROM execution_results er
WHERE er.final_status = 'UNKNOWN_REQUIRES_RECONCILIATION'
AND NOT EXISTS (
  SELECT 1
  FROM execution_results nx
  WHERE nx.execution_ticket_id = er.execution_ticket_id
    AND nx.is_reconciliation_event = TRUE
    AND nx.final_status IN ('EXECUTED','PROVIDER_REJECTED','FAILED')
);
