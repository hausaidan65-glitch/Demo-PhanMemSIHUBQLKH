ALTER TABLE `incubation_programs`
  ADD COLUMN `mission_id` int DEFAULT NULL AFTER `id`,
  ADD KEY `idx_incubation_programs_mission_id` (`mission_id`),
  ADD CONSTRAINT `fk_incubation_programs_mission`
    FOREIGN KEY (`mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
