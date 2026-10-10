-- Record which user created each ticket.
-- Tickets used to be tied only to an organization.

ALTER TABLE tickets
    ADD COLUMN created_by INT NULL AFTER client_id,
    ADD CONSTRAINT fk_tickets_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL;

-- Existing tickets: the creator is only certain when the organization
-- has exactly one client user. Others stay NULL.
UPDATE tickets t
JOIN (
    SELECT client_id, MIN(id) AS user_id
    FROM users
    WHERE role = 'client'
    GROUP BY client_id
    HAVING COUNT(*) = 1
) sole
    ON sole.client_id = t.client_id
SET t.created_by = sole.user_id
WHERE t.created_by IS NULL;
