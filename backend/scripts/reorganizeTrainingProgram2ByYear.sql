-- Reorganize training_programs.id = 2 into year-specific clones.
-- Safe one-time migration: aborts and rolls back if the expected source shape changed.

DROP PROCEDURE IF EXISTS migrate_training_program_2_by_year;

DELIMITER $$

CREATE PROCEDURE migrate_training_program_2_by_year()
BEGIN
  DECLARE source_count INT DEFAULT 0;
  DECLARE source_course_count INT DEFAULT 0;
  DECLARE listed_course_count INT DEFAULT 0;
  DECLARE existing_clone_count INT DEFAULT 0;
  DECLARE moved_2025_count INT DEFAULT 0;
  DECLARE moved_2026_count INT DEFAULT 0;
  DECLARE source_remaining_count INT DEFAULT 0;
  DECLARE program_2025_id INT DEFAULT NULL;
  DECLARE program_2026_id INT DEFAULT NULL;
  DECLARE before_class_count INT DEFAULT 0;
  DECLARE after_class_count INT DEFAULT 0;
  DECLARE before_class_id_sum BIGINT DEFAULT 0;
  DECLARE after_class_id_sum BIGINT DEFAULT 0;
  DECLARE before_registration_count INT DEFAULT 0;
  DECLARE after_registration_count INT DEFAULT 0;
  DECLARE before_registration_id_sum BIGINT DEFAULT 0;
  DECLARE after_registration_id_sum BIGINT DEFAULT 0;
  DECLARE before_attendance_count INT DEFAULT 0;
  DECLARE after_attendance_count INT DEFAULT 0;
  DECLARE before_attendance_id_sum BIGINT DEFAULT 0;
  DECLARE after_attendance_id_sum BIGINT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*)
    INTO source_count
  FROM training_programs
  WHERE id = 2
    AND year IS NULL
  FOR UPDATE;

  IF source_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: source program 2 is missing or year is not NULL.';
  END IF;

  SELECT id
  FROM courses
  WHERE program_id = 2
     OR id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117)
  FOR UPDATE;

  SELECT COUNT(*)
    INTO source_course_count
  FROM courses
  WHERE program_id = 2;

  SELECT COUNT(*)
    INTO listed_course_count
  FROM courses
  WHERE program_id = 2
    AND id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117);

  IF source_course_count <> 13 OR listed_course_count <> 13 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: program 2 course membership does not match the approved 13 IDs.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM courses
    WHERE id = 85
      AND program_id = 2
      AND deleted_at IS NOT NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: soft-deleted course 85 is not on source program 2.';
  END IF;

  SELECT COUNT(*)
    INTO existing_clone_count
  FROM training_programs candidate
  INNER JOIN training_programs source
    ON source.id = 2
   AND candidate.program_name = source.program_name
  WHERE candidate.id <> source.id
    AND candidate.year IN (2025, 2026);

  IF existing_clone_count <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: a 2025/2026 clone of program 2 already exists.';
  END IF;

  SELECT COUNT(DISTINCT cc.id), COALESCE(SUM(DISTINCT cc.id), 0)
    INTO before_class_count, before_class_id_sum
  FROM course_classes cc
  WHERE cc.course_id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117);

  SELECT COUNT(DISTINCT r.id), COALESCE(SUM(DISTINCT r.id), 0)
    INTO before_registration_count, before_registration_id_sum
  FROM registrations r
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117);

  SELECT COUNT(DISTINCT attendance.id), COALESCE(SUM(DISTINCT attendance.id), 0)
    INTO before_attendance_count, before_attendance_id_sum
  FROM course_class_attendances attendance
  INNER JOIN registrations r ON r.id = attendance.registration_id
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117);

  INSERT INTO training_programs
    (program_name, description, status, created_at, updated_at, mission_id, year)
  SELECT
    program_name, description, status, created_at, updated_at, mission_id, 2025
  FROM training_programs
  WHERE id = 2;

  SET program_2025_id = LAST_INSERT_ID();

  INSERT INTO training_programs
    (program_name, description, status, created_at, updated_at, mission_id, year)
  SELECT
    program_name, description, status, created_at, updated_at, mission_id, 2026
  FROM training_programs
  WHERE id = 2;

  SET program_2026_id = LAST_INSERT_ID();

  UPDATE courses
  SET program_id = program_2025_id
  WHERE program_id = 2
    AND id IN (44, 114, 116, 117);

  SET moved_2025_count = ROW_COUNT();

  IF moved_2025_count <> 4 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: expected to move exactly 4 courses into 2025.';
  END IF;

  UPDATE courses
  SET program_id = program_2026_id
  WHERE program_id = 2
    AND id IN (42);

  SET moved_2026_count = ROW_COUNT();

  IF moved_2026_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: expected to move exactly 1 course into 2026.';
  END IF;

  SELECT COUNT(*)
    INTO source_remaining_count
  FROM courses
  WHERE program_id = 2
    AND id IN (38, 39, 40, 41, 43, 45, 85, 115);

  IF source_remaining_count <> 8 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: expected 8 approved unknown courses to remain on source.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM courses
    WHERE id = 85
      AND program_id = 2
      AND deleted_at IS NOT NULL
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 85 was moved or lost its soft-delete state.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM training_programs clone
    INNER JOIN training_programs source ON source.id = 2
    WHERE clone.id IN (program_2025_id, program_2026_id)
      AND NOT (
        clone.program_name <=> source.program_name
        AND clone.description <=> source.description
        AND clone.status <=> source.status
        AND clone.created_at <=> source.created_at
        AND clone.updated_at <=> source.updated_at
        AND clone.mission_id <=> source.mission_id
      )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: cloned program fields do not match source program 2.';
  END IF;

  SELECT COUNT(DISTINCT cc.id), COALESCE(SUM(DISTINCT cc.id), 0)
    INTO after_class_count, after_class_id_sum
  FROM course_classes cc
  WHERE cc.course_id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117);

  SELECT COUNT(DISTINCT r.id), COALESCE(SUM(DISTINCT r.id), 0)
    INTO after_registration_count, after_registration_id_sum
  FROM registrations r
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117);

  SELECT COUNT(DISTINCT attendance.id), COALESCE(SUM(DISTINCT attendance.id), 0)
    INTO after_attendance_count, after_attendance_id_sum
  FROM course_class_attendances attendance
  INNER JOIN registrations r ON r.id = attendance.registration_id
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (38, 39, 40, 41, 42, 43, 44, 45, 85, 114, 115, 116, 117);

  IF before_class_count <> after_class_count
     OR before_class_id_sum <> after_class_id_sum
     OR before_registration_count <> after_registration_count
     OR before_registration_id_sum <> after_registration_id_sum
     OR before_attendance_count <> after_attendance_count
     OR before_attendance_id_sum <> after_attendance_id_sum THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: child class, registration, or attendance relationships changed.';
  END IF;

  COMMIT;

  SELECT
    2 AS source_program_id,
    program_2025_id,
    program_2026_id,
    source_remaining_count,
    moved_2025_count,
    moved_2026_count,
    before_class_count AS verified_class_count,
    before_registration_count AS verified_registration_count,
    before_attendance_count AS verified_attendance_count;
END$$

DELIMITER ;

CALL migrate_training_program_2_by_year();
DROP PROCEDURE migrate_training_program_2_by_year;
