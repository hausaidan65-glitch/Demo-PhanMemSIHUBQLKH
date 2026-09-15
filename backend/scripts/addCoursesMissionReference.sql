ALTER TABLE `courses`
  ADD COLUMN `mission_id` int DEFAULT NULL AFTER `mission`,
  ADD KEY `idx_courses_mission_id` (`mission_id`),
  ADD CONSTRAINT `fk_courses_mission`
    FOREIGN KEY (`mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
