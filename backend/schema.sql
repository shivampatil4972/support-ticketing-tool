-- Baseline schema. Later changes live in backend/migrations and are
-- applied with `npm run migrate`, so run that after importing this file.

CREATE DATABASE IF NOT EXISTS support_ticketing;

USE support_ticketing;


-- =========================================
-- CLIENTS
-- =========================================

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,

    organization_name VARCHAR(255) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_clients_org (organization_name)
) ENGINE=InnoDB;


-- =========================================
-- USERS
-- =========================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    role ENUM('client', 'agent', 'admin') NOT NULL,

    client_id INT NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE SET NULL,

    INDEX idx_users_email (email),

    INDEX idx_users_role (role),

    INDEX idx_users_client (client_id),

    INDEX idx_users_active (is_active)
) ENGINE=InnoDB;


-- =========================================
-- TICKETS
-- =========================================

CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,

    title VARCHAR(255) NOT NULL,

    description TEXT NOT NULL,

    attachment_path VARCHAR(255) NULL,

    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL,

    status ENUM('open', 'pending', 'closed') NOT NULL,

    client_id INT NOT NULL,

    assigned_agent_id INT NULL,

    sla_due_date DATETIME NOT NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE,

    FOREIGN KEY (assigned_agent_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    INDEX idx_tickets_status (status),

    INDEX idx_tickets_priority (priority),

    INDEX idx_tickets_client (client_id),

    INDEX idx_tickets_agent (assigned_agent_id),

    INDEX idx_tickets_deleted (is_deleted),

    INDEX idx_tickets_sla (sla_due_date)
) ENGINE=InnoDB;


-- =========================================
-- COMMENTS
-- =========================================

CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    ticket_id INT NOT NULL,

    user_id INT NOT NULL,

    message TEXT NOT NULL,

    attachment_path VARCHAR(255) NULL,

    is_internal TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_comments_ticket (ticket_id),

    INDEX idx_comments_user (user_id)
) ENGINE=InnoDB;