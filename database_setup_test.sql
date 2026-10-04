DROP USER IF EXISTS 'viewer_user'@'localhost';
DROP USER IF EXISTS 'staff_user'@'localhost';
DROP USER IF EXISTS 'admin_user'@'localhost';
DROP USER IF EXISTS 'gapangita_user'@'localhost';

DROP DATABASE IF EXISTS gapangita_db_test;
CREATE DATABASE IF NOT EXISTS gapangita_db_test;

USE gapangita_db_test;

CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(15) UNIQUE,
    NAME VARCHAR(100) NOT NULL UNIQUE,
    DESCRIPTION VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    user_code VARCHAR(15) UNIQUE,
    user_role ENUM('Admin', 'Staff') NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    PASSWORD VARCHAR(255) NOT NULL DEFAULT 'password123',
    contact_number VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS branches (
    branch_id INT AUTO_INCREMENT PRIMARY KEY,
    branch_code VARCHAR(15) UNIQUE,
    NAME VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_code VARCHAR(15) UNIQUE,
    NAME VARCHAR(100) NOT NULL UNIQUE,
    DESCRIPTION VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS branchLocations ( -- (Junction)
    branchLocation_id INT AUTO_INCREMENT PRIMARY KEY,
    branchLocation_code VARCHAR(15) UNIQUE,
    branch_code VARCHAR(15),
    location_code VARCHAR(15),
    FOREIGN KEY (branch_code) REFERENCES branches(branch_code),
    FOREIGN KEY (location_code) REFERENCES locations(location_code)
);

CREATE TABLE IF NOT EXISTS items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(15) UNIQUE,
    NAME VARCHAR(255) NOT NULL,
    DESCRIPTION TEXT,
    item_type ENUM('lost', 'found') NOT NULL,
    STATUS ENUM('open', 'resolved', 'closed') DEFAULT 'open',
    category_code VARCHAR(15),
    branch_code VARCHAR(15),
    location_code VARCHAR(15),
    item_file_path VARCHAR(255),
    date_found DATETIME, -- timestamp the item was found by the reporter
    date_reported DATETIME DEFAULT CURRENT_TIMESTAMP, -- timestamp the item was reported by the reporter
    close_at DATETIME,
    times_unclaimed INT DEFAULT 0,
    FOREIGN KEY (category_code) REFERENCES categories(category_code) ON DELETE SET NULL,
    FOREIGN KEY (branch_code) REFERENCES branches(branch_code) ON DELETE SET NULL,
    FOREIGN KEY (location_code) REFERENCES locations(location_code) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS claimed_items ( -- new table
    claimed_item_id INT AUTO_INCREMENT PRIMARY KEY,
    claimed_item_code VARCHAR(15) UNIQUE,
    item_code VARCHAR(15) NOT NULL UNIQUE, -- Foreign
    claimer_first_name VARCHAR(50) NOT NULL, -- NEW CLAIMER FIRST NAME
    claimer_middle_name VARCHAR(50) DEFAULT NULL, -- NEW CLAIMER MIDDLE NAME
    claimer_last_name VARCHAR(50) NOT NULL, -- NEW CLAIMER LAST NAME
    contact_number VARCHAR(20) NOT NULL,
    claimProof_file_path VARCHAR(255),
    date_claimed DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS unarchived_items ( -- NEW table
    unarchived_item_id INT AUTO_INCREMENT PRIMARY KEY,
    unarchived_item_code VARCHAR(15) UNIQUE,
    item_code VARCHAR(15) NOT NULL, -- Foreign
    claimer_first_name VARCHAR(50) NOT NULL, -- NEW CLAIMER FIRST NAME
    claimer_middle_name VARCHAR(50) DEFAULT NULL, -- NEW CLAIMER MIDDLE NAME
    claimer_last_name VARCHAR(50) NOT NULL, -- NEW CLAIMER LAST NAME
    contact_number VARCHAR(20) NOT NULL,
    claimProof_file_path VARCHAR(255),
    date_claimed DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_unarchived DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

-- CREATE TABLE IF NOT EXISTS unarchivedClaimed_items ( -- NEW table (Junction) SCRAPPED TABLE
--    unarchivedClaimed_item_id INT AUTO_INCREMENT PRIMARY KEY,
--    unarchivedClaimed_item_code VARCHAR(15) UNIQUE,
--    claimed_item_code VARCHAR(15) NOT NULL, -- Foreign
--    unarchived_item_code VARCHAR(15) NOT NULL, -- Foreign
--    FOREIGN KEY (claimed_item_code) REFERENCES claimed_items(claimed_item_code),
--    FOREIGN KEY (unarchived_item_code) REFERENCES unarchived_items(unarchived_item_code)
-- );


CREATE TABLE ID_Counters (
    TABLE_NAME VARCHAR(50) PRIMARY KEY,
    prefix VARCHAR(10) NOT NULL,
    last_number INT NOT NULL DEFAULT 0
);

INSERT INTO ID_Counters (TABLE_NAME, prefix) VALUES
('logs', 'LOG'),
('users', 'USR'),
('branches', 'BRH'),
('locations', 'LOC'),
('branchlocations', 'BRH-LOC'),
('categories', 'CAT'),
('items', 'ITM'),
('claimed_items', 'CLM'),
('unarchived_items', 'UNA'),
('unarchivedClaimed_items', 'CLM-UNA');

CREATE TABLE LOGS (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    log_code VARCHAR(15) UNIQUE,
    user_code VARCHAR(15),
    action_doer VARCHAR(30) NOT NULL,
    affected_record_id VARCHAR(15),
    action_name VARCHAR(50) NOT NULL,
    action_details TEXT,
    action_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_code) REFERENCES users(user_code)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);


-- Create Views
-- 1
DROP VIEW IF EXISTS vw_openAllItems;
CREATE VIEW vw_openAllItems AS
SELECT
	i.item_id,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.STATUS AS `status`,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported	
FROM items AS i
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE STATUS = 'open';
-- SELECT * FROM vw_openAllItems;

-- 2
DROP VIEW IF EXISTS vw_openLostItems;
CREATE VIEW vw_openLostItems AS
SELECT
	i.item_id,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.STATUS AS `status`,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported	
FROM items AS i
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE STATUS = 'open' AND item_type = 'lost';
-- SELECT * FROM vw_openLostItems;

-- 3
DROP VIEW IF EXISTS vw_openFoundItems;
CREATE VIEW vw_openFoundItems AS
SELECT
	i.item_id,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.STATUS AS `status`,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported	
FROM items AS i
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE STATUS = 'open' AND item_type = 'found';
-- SELECT * FROM vw_openFoundItems;

-- 4
DROP VIEW IF EXISTS vw_closedAllItems;
CREATE VIEW vw_closedAllItems AS
SELECT
	i.item_id,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.STATUS AS `status`,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported	
FROM items AS i
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE STATUS = 'closed';
-- SELECT * FROM vw_closedAllItems;

-- 5
DROP VIEW IF EXISTS vw_closedLostItems;
CREATE VIEW vw_closedLostItems AS
SELECT
	i.item_id,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.STATUS AS `status`,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported	
FROM items AS i
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE STATUS = 'closed' AND item_type = 'lost';
-- SELECT * FROM vw_closedLostItems;

-- 6
DROP VIEW IF EXISTS vw_closedFoundItems;
CREATE VIEW vw_closedFoundItems AS
SELECT
	i.item_id,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.STATUS AS `status`,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported	
FROM items AS i
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE STATUS = 'closed' AND item_type = 'found';
-- SELECT * FROM vw_closedFoundItems;

-- 7
DROP VIEW IF EXISTS vw_archivedLost;
CREATE VIEW vw_archivedLost AS
SELECT
	un.unarchived_item_id,
	un.unarchived_item_code,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported,
	un.claimer_first_name,
	un.claimer_middle_name,
	un.claimer_last_name,
	un.contact_number,
	un.claimProof_file_path,
	un.date_claimed,
	un.date_unarchived,
	un.reason
FROM unarchived_items AS un
LEFT JOIN items AS i
	ON i.item_code = un.item_code	
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE i.item_type = 'lost' AND i.times_unclaimed > 0;
-- SELECT * FROM vw_archivedLost;

-- 8
DROP VIEW IF EXISTS vw_archivedFound;
CREATE VIEW vw_archivedFound AS
SELECT
	un.unarchived_item_id,
	un.unarchived_item_code,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported,
	un.claimer_first_name,
	un.claimer_middle_name,
	un.claimer_last_name,
	un.contact_number,
	un.claimProof_file_path,
	un.date_claimed,
	un.date_unarchived,
	un.reason
FROM unarchived_items AS un
LEFT JOIN items AS i
	ON i.item_code = un.item_code	
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE i.item_type = 'found' AND i.times_unclaimed > 0;
-- SELECT * FROM vw_archivedFound;

-- 9
DROP VIEW IF EXISTS vw_archivedAll;
CREATE VIEW vw_archivedAll AS
SELECT
	un.unarchived_item_id,
	un.unarchived_item_code,
	i.item_code,
	i.NAME AS `name`,
	i.DESCRIPTION AS `description`,
	i.item_type,
	i.category_code,
	c.name AS `categoryName`,
	c.description AS `categoryDescription`,
	i.branch_code,
	b.name AS `branchName`,
	i.location_code,
	l.name AS `locationName`,
	l.description AS `locationDescription`,
	i.item_file_path,
	i.date_found,
	i.date_reported,
	un.claimer_first_name,
	un.claimer_middle_name,
	un.claimer_last_name,
	un.contact_number,
	un.claimProof_file_path,
	un.date_claimed,
	un.date_unarchived,
	un.reason
FROM unarchived_items AS un
LEFT JOIN items AS i
	ON i.item_code = un.item_code	
LEFT JOIN categories AS c
	ON i.category_code = c.category_code
LEFT JOIN branches AS b
	ON i.branch_code = b.branch_code
LEFT JOIN locations AS l
	ON i.location_code = l.location_code
WHERE i.times_unclaimed > 0;
-- SELECT * FROM vw_archivedAll;

-- 10
DROP VIEW IF EXISTS vw_categories;
CREATE VIEW vw_categories AS
SELECT category_code, NAME FROM categories ORDER BY NAME;
-- SELECT * FROM vw_categories;

-- 11
DROP VIEW IF EXISTS vw_branches;
CREATE VIEW vw_branches AS
SELECT branch_code, NAME FROM branches ORDER BY NAME;
-- SELECT * FROM vw_branches;

-- 12
DROP VIEW IF EXISTS vw_locations;
CREATE VIEW vw_locations AS
SELECT location_code, NAME FROM locations ORDER BY NAME;
-- SELECT * FROM vw_locations;

-- 13
DROP VIEW IF EXISTS vw_userLogin;
CREATE VIEW vw_userLogin AS
SELECT user_id, user_code, user_role, username, PASSWORD
FROM users;
-- SELECT * FROM vw_userLogin;

-- 14
DROP VIEW IF EXISTS vw_branchLocations;
CREATE VIEW vw_branchLocations AS
SELECT bl.branch_code AS `branch_code`, l.location_code, l.NAME AS `NAME`
FROM locations l
JOIN branchLocations bl ON l.location_code = bl.location_code;
-- SELECT * FROM vw_branchLocations WHERE branch_code = 'BRH0001' ORDER BY NAME;


-- Create Stored Procedures
-- 1
DROP PROCEDURE IF EXISTS sp_submit_report;

DELIMITER $$

CREATE PROCEDURE sp_submit_report(
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_item_type ENUM('lost', 'found'),
    IN p_category_code VARCHAR(15),
    IN p_branch_code VARCHAR(15),
    IN p_location_code VARCHAR(15),
    IN p_item_file_path VARCHAR(255),
    IN p_date_found DATETIME
)
BEGIN
    INSERT INTO items (
        NAME, 
        DESCRIPTION, 
        item_type, 
        STATUS,
        category_code, 
        branch_code, 
        location_code, 
        item_file_path,
        date_found
    )
    VALUES (
        p_name, 
        p_description, 
        p_item_type, 
        'open',
        p_category_code, 
        p_branch_code, 
        p_location_code, 
        p_item_file_path,
        p_date_found
    );
END$$

DELIMITER ;

-- 2
DROP PROCEDURE IF EXISTS sp_insert_into_claimed_items;

DELIMITER $$

CREATE PROCEDURE sp_insert_into_claimed_items(
    IN p_item_code VARCHAR(15),
    IN p_claimer_first_name VARCHAR(50),
    IN p_claimer_middle_name VARCHAR(50),
    IN p_claimer_last_name VARCHAR(50),
    IN p_contact_number VARCHAR(20),
    IN p_claimProof_file_path VARCHAR(255)
)
BEGIN    
    INSERT INTO claimed_items (
        item_code, 
        claimer_first_name, 
        claimer_middle_name, 
        claimer_last_name, 
        contact_number, 
        claimProof_file_path
    )
    VALUES (
        p_item_code, 
        p_claimer_first_name, 
        p_claimer_middle_name, 
        p_claimer_last_name, 
        p_contact_number, 
        p_claimProof_file_path
    );
END$$

DELIMITER ;

-- 3
DROP PROCEDURE IF EXISTS sp_unarchive_item;

DELIMITER $$

CREATE PROCEDURE sp_unarchive_item (
    IN p_item_code VARCHAR(15),
    IN p_reason TEXT
)
BEGIN
    DECLARE v_has_claim INT;
    
    START TRANSACTION;

    UPDATE items
    SET STATUS = 'open'
    WHERE item_code = p_item_code;    

    UPDATE items
    SET times_unclaimed = COALESCE(times_unclaimed, 0) + 1
    WHERE item_code = p_item_code;

    SELECT COUNT(*) INTO v_has_claim 
    FROM claimed_items 
    WHERE item_code = p_item_code;

    IF v_has_claim > 0 THEN
        INSERT INTO unarchived_items (
            item_code,
            claimer_first_name,
            claimer_middle_name,
            claimer_last_name,
            contact_number,
            claimProof_file_path,
            date_claimed,
            reason
        )
        SELECT
            item_code,
            claimer_first_name,
            claimer_middle_name,
            claimer_last_name,
            contact_number,
            claimProof_file_path,
            date_claimed,
            p_reason
        FROM claimed_items
        WHERE item_code = p_item_code;

        DELETE FROM claimed_items
        WHERE item_code = p_item_code;
    ELSE
 
        INSERT INTO unarchived_items (
            item_code,
            claimer_first_name,
            claimer_last_name,
            contact_number,
            reason
        )
        VALUES (
            p_item_code,
            'SYSTEM',
            'RESTORE',
            'N/A',
            p_reason
        );
    END IF;

    COMMIT;
END$$

DELIMITER ;

-- Create Functions
-- 1
DROP FUNCTION IF EXISTS fn_generate_id;

DELIMITER $$

CREATE FUNCTION fn_generate_id(
    p_table_name VARCHAR(50)
)
RETURNS VARCHAR(20)
DETERMINISTIC
MODIFIES SQL DATA
BEGIN
    DECLARE v_prefix VARCHAR(10);
    DECLARE v_last_number INT;
    DECLARE v_new_id VARCHAR(20);

    -- Get current counter
    SELECT prefix, last_number
    INTO v_prefix, v_last_number
    FROM ID_Counters
    WHERE TABLE_NAME = LOWER(p_table_name);

    -- Increment counter
    SET v_last_number = v_last_number + 1;

    -- Update counter table
    UPDATE ID_Counters
    SET last_number = v_last_number
    WHERE TABLE_NAME = LOWER(p_table_name);

    -- Build formatted ID
    SET v_new_id = CONCAT(
        v_prefix,
        LPAD(v_last_number, 4, '0')
    );

    RETURN v_new_id;
END$$

DELIMITER ;


-- Create Triggers
-- 1
DROP TRIGGER IF EXISTS trg_users_auto_id;

DELIMITER $$

CREATE TRIGGER trg_users_auto_id
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.user_code IS NULL THEN
        SET NEW.user_code = fn_generate_id('users');
    END IF;
END$$

DELIMITER ;

-- 2
DROP TRIGGER IF EXISTS trg_branches_auto_id;

DELIMITER $$

CREATE TRIGGER trg_branches_auto_id
BEFORE INSERT ON branches
FOR EACH ROW
BEGIN
    IF NEW.branch_code IS NULL THEN
        SET NEW.branch_code = fn_generate_id('branches');
    END IF;
END$$

DELIMITER ;

-- 3
DROP TRIGGER IF EXISTS trg_branchLocations_auto_id;

DELIMITER $$

CREATE TRIGGER trg_branchLocations_auto_id
BEFORE INSERT ON branchLocations
FOR EACH ROW
BEGIN
    IF NEW.branchLocation_code IS NULL THEN
        SET NEW.branchLocation_code = fn_generate_id('branchlocations');
    END IF;
END$$

DELIMITER ;

-- 4
DROP TRIGGER IF EXISTS trg_categories_auto_id;

DELIMITER $$

CREATE TRIGGER trg_categories_auto_id
BEFORE INSERT ON categories
FOR EACH ROW
BEGIN
    IF NEW.category_code IS NULL THEN
        SET NEW.category_code = fn_generate_id('categories');
    END IF;
END$$

DELIMITER ;

-- 5
DROP TRIGGER IF EXISTS trg_items_auto_id;

DELIMITER $$

CREATE TRIGGER trg_items_auto_id
BEFORE INSERT ON items
FOR EACH ROW
BEGIN
    IF NEW.item_code IS NULL THEN
        SET NEW.item_code = fn_generate_id('items');
    END IF;
END$$

DELIMITER ;

-- 6
DROP TRIGGER IF EXISTS trg_locations_auto_id;

DELIMITER $$

CREATE TRIGGER trg_locations_auto_id
BEFORE INSERT ON locations
FOR EACH ROW
BEGIN
    IF NEW.location_code IS NULL THEN
        SET NEW.location_code = fn_generate_id('locations');
    END IF;
END$$

DELIMITER ;

-- 7
DROP TRIGGER IF EXISTS trg_logs_auto_id;

DELIMITER $$

CREATE TRIGGER trg_logs_auto_id
BEFORE INSERT ON LOGS
FOR EACH ROW
BEGIN
    IF NEW.log_code IS NULL THEN
        SET NEW.log_code = fn_generate_id('logs');
    END IF;
END$$

DELIMITER ;

-- 8
-- ('unarchived_items', 'UNA'),

DROP TRIGGER IF EXISTS trg_unarchived_auto_id;

DELIMITER $$

CREATE TRIGGER trg_unarchived_auto_id
BEFORE INSERT ON unarchived_items
FOR EACH ROW
BEGIN
    IF NEW.unarchived_item_code IS NULL THEN
        SET NEW.unarchived_item_code = fn_generate_id('unarchived_items');
    END IF;
END$$

DELIMITER ;

-- 9 -- SCRAPPED
-- ('unarchivedClaimed_items', 'CLM-UNA');

-- DROP TRIGGER IF EXISTS trg_unarchivedClaimed_auto_id;

-- DELIMITER $$

-- CREATE TRIGGER trg_unarchivedClaimed_auto_id
-- BEFORE INSERT ON unarchivedClaimed_items
-- FOR EACH ROW
-- BEGIN
--     IF NEW.unarchivedClaimed_item_code IS NULL THEN
--         SET NEW.unarchivedClaimed_item_code = fn_generate_id('unarchivedClaimed_items');
--     END IF;
-- END$$

-- DELIMITER ;

-- 10
DROP TRIGGER IF EXISTS trg_set_close_date;

DELIMITER $$

CREATE TRIGGER trg_set_close_date
BEFORE INSERT ON items
FOR EACH ROW
BEGIN
    IF NEW.status = 'open' THEN
        SET NEW.close_at = DATE_ADD(NOW(), INTERVAL 14 DAY);
    END IF;
END$$

DELIMITER ;

-- 11
DROP TRIGGER IF EXISTS trg_reset_close_date;

DELIMITER $$

CREATE TRIGGER trg_reset_close_date
BEFORE UPDATE ON items
FOR EACH ROW
BEGIN
    IF NEW.status = 'open' AND OLD.status <> 'open' THEN
        SET NEW.close_at = DATE_ADD(NOW(), INTERVAL 14 DAY);
    END IF;
END$$

DELIMITER ;

-- 12
DROP TRIGGER IF EXISTS trg_claimed_items_auto_id;

DELIMITER $$

CREATE TRIGGER trg_claimed_items_auto_id
BEFORE INSERT ON claimed_items
FOR EACH ROW
BEGIN
    IF NEW.claimed_item_code IS NULL THEN
        SET NEW.claimed_item_code = fn_generate_id('claimed_items');
    END IF;
END$$

DELIMITER ;

-- 13
DROP TRIGGER IF EXISTS trg_auto_resolved_claimed_items;

DELIMITER $$

CREATE TRIGGER trg_auto_resolved_claimed_items
AFTER INSERT ON claimed_items
FOR EACH ROW
BEGIN
    UPDATE items
    SET STATUS = 'closed'
    WHERE item_code = NEW.item_code;
END$$

DELIMITER ;

/* =========================================================
   LOGGING TRIGGERS
   ========================================================= */

DELIMITER $$

/* =========================================================
   USERS
   ========================================================= */

DROP TRIGGER IF EXISTS trg_log_users_insert$$
CREATE TRIGGER trg_log_users_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        NEW.user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.user_code,
        'INSERT USER',
        CONCAT(
            'Inserted user: Username=', NEW.username,
            ', Email=', NEW.email,
            ', Contact=', NEW.contact_number
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_users_update$$
CREATE TRIGGER trg_log_users_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        NEW.user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.user_code,
        'UPDATE USER',
        CONCAT(
            'Updated user: Username ', OLD.username, ' -> ', NEW.username,
            ', Email ', OLD.email, ' -> ', NEW.email,
            ', Contact ', OLD.contact_number, ' -> ', NEW.contact_number
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_users_delete$$
CREATE TRIGGER trg_log_users_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        OLD.user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        OLD.user_code,
        'DELETE USER',
        CONCAT(
            'Deleted user: Username=', OLD.username,
            ', Email=', OLD.email
        ),
        NOW()
    );
END$$


/* =========================================================
   CATEGORIES
   ========================================================= */

DROP TRIGGER IF EXISTS trg_log_categories_insert$$
CREATE TRIGGER trg_log_categories_insert
AFTER INSERT ON categories
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.category_code,
        'INSERT CATEGORY',
        CONCAT(
            'Inserted category: Name=', NEW.NAME
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_categories_update$$
CREATE TRIGGER trg_log_categories_update
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.category_code,
        'UPDATE CATEGORY',
        CONCAT(
            'Updated category: Name ', OLD.NAME,
            ' -> ', NEW.NAME
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_categories_delete$$
CREATE TRIGGER trg_log_categories_delete
AFTER DELETE ON categories
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        OLD.category_code,
        'DELETE CATEGORY',
        CONCAT(
            'Deleted category: Name=', OLD.NAME
        ),
        NOW()
    );
END$$


/* =========================================================
   BRANCHES
   ========================================================= */

DROP TRIGGER IF EXISTS trg_log_branches_insert$$
CREATE TRIGGER trg_log_branches_insert
AFTER INSERT ON branches
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.branch_code,
        'INSERT BRANCH',
        CONCAT(
            'Inserted branch: Name=', NEW.NAME
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_branches_update$$
CREATE TRIGGER trg_log_branches_update
AFTER UPDATE ON branches
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.branch_code,
        'UPDATE BRANCH',
        CONCAT(
            'Updated branch: Name ', OLD.NAME,
            ' -> ', NEW.NAME
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_branches_delete$$
CREATE TRIGGER trg_log_branches_delete
AFTER DELETE ON branches
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        OLD.branch_code,
        'DELETE BRANCH',
        CONCAT(
            'Deleted branch: Name=', OLD.NAME
        ),
        NOW()
    );
END$$


/* =========================================================
   LOCATIONS
   ========================================================= */

DROP TRIGGER IF EXISTS trg_log_locations_insert$$
CREATE TRIGGER trg_log_locations_insert
AFTER INSERT ON locations
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.location_code,
        'INSERT LOCATION',
        CONCAT(
            'Inserted location: Name=', NEW.NAME
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_locations_update$$
CREATE TRIGGER trg_log_locations_update
AFTER UPDATE ON locations
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.location_code,
        'UPDATE LOCATION',
        CONCAT(
            'Updated location: Name ', OLD.NAME,
            ' -> ', NEW.NAME
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_locations_delete$$
CREATE TRIGGER trg_log_locations_delete
AFTER DELETE ON locations
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        OLD.location_code,
        'DELETE LOCATION',
        CONCAT(
            'Deleted location: Name=', OLD.NAME
        ),
        NOW()
    );
END$$


/* =========================================================
   ITEMS
   ========================================================= */
DELIMITER $$
DROP TRIGGER IF EXISTS trg_log_items_insert$$
CREATE TRIGGER trg_log_items_insert
AFTER INSERT ON items
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.item_code,
        'INSERT ITEM',
        CONCAT(
            'Inserted item: Name=', NEW.NAME,
            ', Type=', NEW.item_type,
            ', Status=', NEW.STATUS,
            ', Category=', NEW.category_code,
            ', Branch=', NEW.branch_code,
            ', Location=', NEW.location_code,
            ', Description=', NEW.description        
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_items_update$$
CREATE TRIGGER trg_log_items_update
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        NEW.item_code,
        'UPDATE ITEM',
        CONCAT(
            'Updated item: Name ', OLD.NAME,
            ' -> ', NEW.NAME,
            ', Status ', OLD.STATUS,
            ' -> ', NEW.STATUS,
            ', Type ', OLD.item_type,
            ' -> ', NEW.item_type
        ),
        NOW()
    );
END$$

DROP TRIGGER IF EXISTS trg_log_items_delete$$
CREATE TRIGGER trg_log_items_delete
AFTER DELETE ON items
FOR EACH ROW
BEGIN
    INSERT INTO LOGS (
        log_code,
        user_code,
        action_doer,
        affected_record_id,
        action_name,
        action_details,
        action_datetime
    )
    VALUES (
        NULL,
        @logged_in_user_code,
        IFNULL(@logged_in_username, 'SYSTEM'),
        OLD.item_code,
        'DELETE ITEM',
        CONCAT(
            'Deleted item: Name=', OLD.NAME,
            ', Type=', OLD.item_type
        ),
        NOW()
    );
END$$

DELIMITER ;


-- Create Events

SET GLOBAL event_scheduler = OFF;
SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS ev_auto_close_items;

-- 1
DELIMITER $$

CREATE EVENT ev_auto_close_items
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    UPDATE items
    SET STATUS = 'closed'
    WHERE STATUS = 'open'
      AND close_at <= NOW();
END$$

DELIMITER ;


-- Insert Into Statements
-- Insert some default categories
INSERT IGNORE INTO categories (NAME, DESCRIPTION) VALUES
('Electronics', 'Smartphones, Laptops, Tablets, etc.'),
('Wallets & IDs', 'Purses, Credit Cards, etc.'),
('Keys', 'House, Car, Keychains'),
('Bags & Luggage', 'Backpacks, Handbags, etc.'),
('Eyewear', 'Sunglasses, Prescription Glasses'),
('Jewelry & Watches', 'Rings, Necklaces, etc.'),
('Clothing', 'Jackets, Sweaters, Hats, etc.'),
('Books & Stationery', 'Textbooks, Notebooks, etc.'),
('Documents', 'Folders, Certificates, Files'),
('Sports & Outdoors', 'Water Bottles, Gym Bags, etc.'),
('Miscellaneous', 'Health & Beauty, Tools, Other');

-- Insert some default branches
INSERT IGNORE INTO branches (NAME) VALUES
('UM Tagum Main'),
('UM Tagum Visayan');

-- Insert some default locations
INSERT IGNORE INTO locations (NAME, DESCRIPTION) VALUES
('Academic Buildings', 'Lecture Halls, Classrooms'),
('Laboratories', 'Computer, Science, Engineering'),
('Libraries', 'Main Library, Study Rooms'),
('Student Centers', 'Lounge, Organization Offices'),
('Administrative Offices', 'Registrar, Finance'),
('Cafeterias & Food Courts', 'Main Canteen, Kiosks'),
('Sports & Athletics', 'Gymnasium, Open Courts'),
('Religious Spaces', 'Campus Chapel, Prayer Rooms'),
('Parking Areas', 'Student, Faculty, Drop-off'),
('Outdoor Areas', 'Gazebos, Courtyards, Main Gate'),
('Restrooms', 'Floor-specific, PWD Access');

-- Insert some default branchLocations
INSERT IGNORE INTO branchLocations (branch_code, location_code) VALUES
('BRH0001', 'LOC0001'),
('BRH0001', 'LOC0002'),
('BRH0001', 'LOC0003'),
('BRH0001', 'LOC0004'),
('BRH0001', 'LOC0005'),
('BRH0001', 'LOC0006'),
('BRH0001', 'LOC0007'),
('BRH0001', 'LOC0008'),
('BRH0001', 'LOC0009'),
('BRH0001', 'LOC0010'),
('BRH0001', 'LOC0011'),

('BRH0002', 'LOC0001'),
('BRH0002', 'LOC0002'),
('BRH0002', 'LOC0003'),
('BRH0002', 'LOC0004'),
('BRH0002', 'LOC0006'),
('BRH0002', 'LOC0007'),
('BRH0002', 'LOC0009'),
('BRH0002', 'LOC0010'),
('BRH0002', 'LOC0011');

-- Insert users
INSERT IGNORE INTO users (user_role, username, email, PASSWORD, contact_number) VALUES
('Admin', 'Admin123', 'admin123@gapangita.local', '$2b$12$SIZ70qTKnwZoab81FHOXKeFHrL8zMbi8UokSp8q8elLVuL.gxYkMS', '0000000000'), -- Pass is Admin123
('Admin', 'Admin', 'admin@gapangita.local', 'Admin', '0000000001');
-- ('Staff', 'Staff123', 'staff@gapangita.local', 'Staff123', '0000000001'),
-- ('Staff', 'Anonymous', 'anonymous@gapangita.local', 'password123', '0000000002');

-- Insert default items for testing
INSERT INTO items (
    NAME,
    DESCRIPTION,
    item_type,
    STATUS,
    category_code,
    branch_code,
    location_code,
    item_file_path,
    date_found,
    date_reported,
    close_at
)
SELECT
    CONCAT(
        c.NAME,
        ' Item - ',
        b.NAME,
        ' - ',
        l.NAME
    ) AS NAME,

    CONCAT(
        'Seed item for category ',
        c.NAME,
        ', branch ',
        b.NAME,
        ', location ',
        l.NAME
    ) AS DESCRIPTION,

    CASE
        WHEN MOD(c.category_id, 2) = 0 THEN 'lost'
        ELSE 'found'
    END AS item_type,

    'open' AS STATUS,

    c.category_code,
    b.branch_code,
    l.location_code,

    '/uploads/items/default_item.jpg' AS item_file_path,

    DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 10) DAY) AS date_found,
    NOW() AS date_reported,
    NULL AS close_at

FROM categories c
CROSS JOIN branches b
JOIN branchLocations bl
    ON bl.branch_code = b.branch_code
JOIN locations l
    ON l.location_code = bl.location_code;


-- DCL Statements
-- User
CREATE USER IF NOT EXISTS 'viewer_user'@'localhost'
IDENTIFIED BY 'Viewer123!';

GRANT SELECT ON gapangita_db_test.* TO 'viewer_user'@'localhost';
FLUSH PRIVILEGES;
-- SHOW GRANTS FOR 'viewer_user'@'localhost';

-- Staff
CREATE USER IF NOT EXISTS 'staff_user'@'localhost'
IDENTIFIED BY 'Staff123!';

GRANT SELECT ON gapangita_db_test.vw_categories TO 'staff_user'@'localhost';
GRANT SELECT ON gapangita_db_test.vw_branches TO 'staff_user'@'localhost';
GRANT SELECT ON gapangita_db_test.vw_locations TO 'staff_user'@'localhost';
GRANT SELECT ON gapangita_db_test.vw_branchLocations TO 'staff_user'@'localhost';

GRANT EXECUTE ON PROCEDURE gapangita_db_test.sp_submit_report TO 'staff_user'@'localhost';

FLUSH PRIVILEGES;
-- SHOW GRANTS FOR 'staff_user'@'localhost';

-- Admin
CREATE USER IF NOT EXISTS 'admin_user'@'localhost'
IDENTIFIED BY 'Admin123!';

GRANT SELECT ON gapangita_db_test.* TO 'admin_user'@'localhost';
GRANT INSERT, UPDATE ON gapangita_db_test.users TO 'admin_user'@'localhost';
GRANT EXECUTE ON PROCEDURE gapangita_db_test.sp_submit_report TO 'admin_user'@'localhost';
GRANT INSERT, UPDATE, DELETE ON gapangita_db_test.categories TO 'admin_user'@'localhost';
GRANT INSERT, UPDATE, DELETE ON gapangita_db_test.branches TO 'admin_user'@'localhost';
GRANT INSERT, UPDATE, DELETE ON gapangita_db_test.locations TO 'admin_user'@'localhost';
GRANT INSERT, UPDATE, DELETE ON gapangita_db_test.branchLocations TO 'admin_user'@'localhost';

FLUSH PRIVILEGES;
-- SHOW GRANTS FOR 'admin_user'@'localhost';

-- Super Admin (gapangita_user)
CREATE USER IF NOT EXISTS 'gapangita_user'@'localhost'
IDENTIFIED BY 'Gapangita_Secure_123!';

GRANT ALL PRIVILEGES ON gapangita_db_test.* TO 'gapangita_user'@'localhost';
-- GRANT ALL PRIVILEGES ON *.* TO 'gapangita_user'@'localhost';
-- Use the above sql one if the first grant query doesn't work (when it returns "error": "1044 (42000): Access denied for user 'gapangita_user'@'localhost' to database 'gapangita_db_test'")
FLUSH PRIVILEGES;
-- SHOW GRANTS FOR 'gapangita_user'@'localhost';
