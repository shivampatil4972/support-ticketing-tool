-- Audit timeline, in-app notifications, and the timestamps behind the
-- performance dashboard and the reopen window.

-- =========================================
-- TICKET EVENTS (audit timeline)
-- =========================================

CREATE TABLE IF NOT EXISTS ticket_events (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ticket_id INT NOT NULL,

    -- NULL when the acting user has since been removed
    user_id INT NULL,

    -- created, status_changed, assigned, unassigned, claimed, reopened
    type VARCHAR(32) NOT NULL,

    from_value VARCHAR(255) NULL,

    to_value VARCHAR(255) NULL,

    created_at DATETIME NOT NULL,

    FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    INDEX idx_events_ticket (ticket_id, created_at)
) ENGINE=InnoDB;

-- =========================================
-- NOTIFICATIONS
-- =========================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    ticket_id INT NULL,

    type VARCHAR(32) NOT NULL,

    message VARCHAR(500) NOT NULL,

    is_read TINYINT(1) NOT NULL DEFAULT 0,

    created_at DATETIME NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    INDEX idx_notifications_user (user_id, is_read, id)
) ENGINE=InnoDB;

-- =========================================
-- TICKET METRIC TIMESTAMPS
-- =========================================

ALTER TABLE tickets
    ADD COLUMN first_response_at DATETIME NULL AFTER sla_due_date,
    ADD COLUMN closed_at DATETIME NULL AFTER first_response_at;

-- Existing closed tickets: the last update is the best record of closing
UPDATE tickets
SET closed_at = updated_at
WHERE status = 'closed'
  AND closed_at IS NULL;

-- Existing tickets: first public reply from support staff
UPDATE tickets t
JOIN (
    SELECT c.ticket_id, MIN(c.created_at) AS first_reply
    FROM comments c
    JOIN users u
        ON u.id = c.user_id
    WHERE c.is_internal = 0
      AND u.role IN ('agent', 'admin')
    GROUP BY c.ticket_id
) replies
    ON replies.ticket_id = t.id
SET t.first_response_at = replies.first_reply
WHERE t.first_response_at IS NULL;
