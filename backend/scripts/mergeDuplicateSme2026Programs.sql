-- Merge duplicate 2026 SME training program 23 into keeper program 20.
-- Safe one-time migration: aborts and rolls back if the verified shape changed.

DROP PROCEDURE IF EXISTS merge_duplicate_sme_2026_programs;

DELIMITER $$

CREATE PROCEDURE merge_duplicate_sme_2026_programs()
BEGIN
  DECLARE guard_count INT DEFAULT 0;
  DECLARE affected_count INT DEFAULT 0;
  DECLARE before_keeper_course_count INT DEFAULT 0;
  DECLARE before_class_count INT DEFAULT 0;
  DECLARE before_class_id_sum BIGINT DEFAULT 0;
  DECLARE before_session_count INT DEFAULT 0;
  DECLARE before_session_id_sum BIGINT DEFAULT 0;
  DECLARE before_registration_count INT DEFAULT 0;
  DECLARE before_attendance_count INT DEFAULT 0;
  DECLARE after_class_count INT DEFAULT 0;
  DECLARE after_class_id_sum BIGINT DEFAULT 0;
  DECLARE after_session_count INT DEFAULT 0;
  DECLARE after_session_id_sum BIGINT DEFAULT 0;
  DECLARE after_registration_count INT DEFAULT 0;
  DECLARE after_attendance_count INT DEFAULT 0;
  DECLARE keeper_name TEXT;
  DECLARE keeper_description TEXT;
  DECLARE duplicate_description TEXT;
  DECLARE keeper_mission_id INT DEFAULT NULL;
  DECLARE duplicate_mission_id INT DEFAULT NULL;
  DECLARE course_updated_at DATETIME;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO guard_count
  FROM training_programs
  WHERE id IN (20, 23) AND year = 2026
  FOR UPDATE;
  IF guard_count <> 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: programs 20/23 are missing, already merged, or no longer year 2026.';
  END IF;

  SELECT program_name, description, mission_id
    INTO keeper_name, keeper_description, keeper_mission_id
  FROM training_programs WHERE id = 20;
  SELECT description, mission_id
    INTO duplicate_description, duplicate_mission_id
  FROM training_programs WHERE id = 23;

  IF NOT (keeper_mission_id <=> duplicate_mission_id) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: programs 20 and 23 have conflicting Mission references.';
  END IF;

  SELECT id FROM courses WHERE program_id IN (20, 23) OR id = 125 FOR UPDATE;
  SELECT COUNT(*) INTO before_keeper_course_count FROM courses WHERE program_id = 20;
  IF before_keeper_course_count <> 8
     OR (SELECT COUNT(*) FROM courses WHERE program_id = 20 AND id IN (99,100,101,102,103,104,105,106)) <> 8 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: keeper program 20 no longer has the verified eight courses.';
  END IF;

  IF (SELECT COUNT(*) FROM courses WHERE program_id = 23) <> 1
     OR (SELECT COUNT(*) FROM courses WHERE id = 125 AND program_id = 23) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: duplicate program 23 does not contain only course 125.';
  END IF;

  SELECT COUNT(*) INTO guard_count
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
    AND REFERENCED_TABLE_NAME = 'training_programs';
  IF guard_count <> 1
     OR (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
         WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
           AND REFERENCED_TABLE_NAME = 'training_programs'
           AND TABLE_NAME = 'courses'
           AND COLUMN_NAME = 'program_id') <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: training_programs reference schema changed since audit.';
  END IF;

  SELECT updated_at INTO course_updated_at FROM courses WHERE id = 125;
  SELECT COUNT(*), COALESCE(SUM(id), 0)
    INTO before_class_count, before_class_id_sum
  FROM course_classes WHERE course_id = 125;
  IF before_class_count <> 3
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 125 AND id IN (206,207,208)) <> 3 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 125 class membership changed since audit.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(s.id), 0)
    INTO before_session_count, before_session_id_sum
  FROM course_class_sessions s
  INNER JOIN course_classes cc ON cc.id = s.class_id
  WHERE cc.course_id = 125;
  SELECT COUNT(*) INTO before_registration_count
  FROM registrations r
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id = 125;
  SELECT COUNT(*) INTO before_attendance_count
  FROM course_class_attendances a
  INNER JOIN registrations r ON r.id = a.registration_id
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id = 125;

  IF before_session_count <> 9 OR before_registration_count <> 0 OR before_attendance_count <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 125 downstream counts changed since audit.';
  END IF;

  UPDATE training_programs
  SET description = duplicate_description
  WHERE id = 20 AND description IS NULL;

  UPDATE courses
  SET program_id = 20,
      updated_at = updated_at
  WHERE id = 125 AND program_id = 23;
  SET affected_count = ROW_COUNT();
  IF affected_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 125 was not moved exactly once.';
  END IF;

  IF (SELECT COUNT(*) FROM courses WHERE program_id = 23) <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: program 23 still has course references.';
  END IF;

  DELETE FROM training_programs WHERE id = 23;
  SET affected_count = ROW_COUNT();
  IF affected_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: duplicate program 23 was not deleted exactly once.';
  END IF;

  IF (SELECT COUNT(*) FROM training_programs WHERE id = 23) <> 0
     OR (SELECT COUNT(*) FROM courses WHERE program_id = 23) <> 0
     OR (SELECT COUNT(*) FROM courses WHERE program_id = 20) <> before_keeper_course_count + 1
     OR (SELECT COUNT(*) FROM courses WHERE id = 125 AND program_id = 20) <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: final program/course relationships are incorrect.';
  END IF;

  IF (SELECT program_name FROM training_programs WHERE id = 20) <> keeper_name
     OR NOT ((SELECT mission_id FROM training_programs WHERE id = 20) <=> keeper_mission_id)
     OR NOT ((SELECT description FROM training_programs WHERE id = 20)
             <=> IF(keeper_description IS NULL, duplicate_description, keeper_description))
     OR NOT ((SELECT updated_at FROM courses WHERE id = 125) <=> course_updated_at) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: keeper identity, Mission, description, or course timestamp changed unexpectedly.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(id), 0)
    INTO after_class_count, after_class_id_sum
  FROM course_classes WHERE course_id = 125;
  SELECT COUNT(*), COALESCE(SUM(s.id), 0)
    INTO after_session_count, after_session_id_sum
  FROM course_class_sessions s
  INNER JOIN course_classes cc ON cc.id = s.class_id
  WHERE cc.course_id = 125;
  SELECT COUNT(*) INTO after_registration_count
  FROM registrations r
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id = 125;
  SELECT COUNT(*) INTO after_attendance_count
  FROM course_class_attendances a
  INNER JOIN registrations r ON r.id = a.registration_id
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id = 125;

  IF before_class_count <> after_class_count OR before_class_id_sum <> after_class_id_sum
     OR before_session_count <> after_session_count OR before_session_id_sum <> after_session_id_sum
     OR before_registration_count <> after_registration_count
     OR before_attendance_count <> after_attendance_count THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: protected class/session/participant data changed.';
  END IF;

  COMMIT;

  SELECT 20 AS keep_program_id,
         23 AS removed_program_id,
         125 AS moved_course_id,
         before_keeper_course_count AS keeper_courses_before,
         before_keeper_course_count + 1 AS keeper_courses_after,
         before_class_count AS verified_classes,
         before_session_count AS verified_sessions,
         before_registration_count AS verified_registrations,
         before_attendance_count AS verified_attendance;
END$$

DELIMITER ;

CALL merge_duplicate_sme_2026_programs();
DROP PROCEDURE merge_duplicate_sme_2026_programs;
