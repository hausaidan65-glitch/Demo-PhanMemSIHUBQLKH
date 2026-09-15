ALTER TABLE `networking_events`
  ADD COLUMN `mission_id` int DEFAULT NULL AFTER `mission`,
  ADD KEY `idx_networking_events_mission_id` (`mission_id`),
  ADD CONSTRAINT `fk_networking_events_mission`
    FOREIGN KEY (`mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
