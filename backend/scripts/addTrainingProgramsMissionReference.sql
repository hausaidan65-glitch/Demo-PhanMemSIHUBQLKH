ALTER TABLE `training_programs`
  ADD COLUMN `mission_id` int DEFAULT NULL,
  ADD KEY `idx_training_programs_mission_id` (`mission_id`),
  ADD CONSTRAINT `fk_training_programs_mission`
    FOREIGN KEY (`mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
