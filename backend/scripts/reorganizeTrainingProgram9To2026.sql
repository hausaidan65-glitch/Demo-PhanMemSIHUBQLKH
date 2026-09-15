-- Reorganize training_programs.id = 9 by extracting its verified 2026 courses.
-- Safe one-time migration: aborts and rolls back if the approved source shape changed.

DROP PROCEDURE IF EXISTS migrate_training_program_9_to_2026;

DELIMITER $$

CREATE PROCEDURE migrate_training_program_9_to_2026()
BEGIN
  DECLARE source_count INT DEFAULT 0;
  DECLARE source_course_count INT DEFAULT 0;
  DECLARE listed_course_count INT DEFAULT 0;
  DECLARE existing_clone_count INT DEFAULT 0;
  DECLARE moved_count INT DEFAULT 0;
  DECLARE source_remaining_count INT DEFAULT 0;
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
  WHERE id = 9
    AND year IS NULL
  FOR UPDATE;

  IF source_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: source program 9 is missing or year is not NULL.';
  END IF;

  SELECT id
  FROM courses
  WHERE program_id = 9
     OR id IN (58, 99, 100, 101, 102, 103, 104, 105, 106)
  FOR UPDATE;

  SELECT COUNT(*)
    INTO source_course_count
  FROM courses
  WHERE program_id = 9;

  SELECT COUNT(*)
    INTO listed_course_count
  FROM courses
  WHERE program_id = 9
    AND id IN (58, 99, 100, 101, 102, 103, 104, 105, 106);

  IF source_course_count <> 9 OR listed_course_count <> 9 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: program 9 course membership does not match the approved 9 IDs.';
  END IF;

  SELECT COUNT(*)
    INTO existing_clone_count
  FROM training_programs candidate
  INNER JOIN training_programs source
    ON source.id = 9
   AND candidate.program_name = source.program_name
  WHERE candidate.id <> source.id
    AND candidate.year = 2026;

  IF existing_clone_count <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: a 2026 clone of program 9 already exists.';
  END IF;

  SELECT COUNT(DISTINCT cc.id), COALESCE(SUM(DISTINCT cc.id), 0)
    INTO before_class_count, before_class_id_sum
  FROM course_classes cc
  WHERE cc.course_id IN (58, 99, 100, 101, 102, 103, 104, 105, 106);

  SELECT COUNT(DISTINCT r.id), COALESCE(SUM(DISTINCT r.id), 0)
    INTO before_registration_count, before_registration_id_sum
  FROM registrations r
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (58, 99, 100, 101, 102, 103, 104, 105, 106);

  SELECT COUNT(DISTINCT attendance.id), COALESCE(SUM(DISTINCT attendance.id), 0)
    INTO before_attendance_count, before_attendance_id_sum
  FROM course_class_attendances attendance
  INNER JOIN registrations r ON r.id = attendance.registration_id
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (58, 99, 100, 101, 102, 103, 104, 105, 106);

  INSERT INTO training_programs
    (program_name, description, status, created_at, updated_at, mission_id, year)
  SELECT
    program_name, description, status, created_at, updated_at, mission_id, 2026
  FROM training_programs
  WHERE id = 9;

  SET program_2026_id = LAST_INSERT_ID();

  UPDATE courses
  SET program_id = program_2026_id
  WHERE program_id = 9
    AND id IN (99, 100, 101, 102, 103, 104, 105, 106);

  SET moved_count = ROW_COUNT();

  IF moved_count <> 8 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: expected to move exactly 8 courses into 2026.';
  END IF;

  SELECT COUNT(*)
    INTO source_remaining_count
  FROM courses
  WHERE program_id = 9
    AND id = 58;

  IF source_remaining_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 58 did not remain on source program 9.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM training_programs clone
    INNER JOIN training_programs source ON source.id = 9
    WHERE clone.id = program_2026_id
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
      SET MESSAGE_TEXT = 'Migration aborted: cloned program fields do not match source program 9.';
  END IF;

  SELECT COUNT(DISTINCT cc.id), COALESCE(SUM(DISTINCT cc.id), 0)
    INTO after_class_count, after_class_id_sum
  FROM course_classes cc
  WHERE cc.course_id IN (58, 99, 100, 101, 102, 103, 104, 105, 106);

  SELECT COUNT(DISTINCT r.id), COALESCE(SUM(DISTINCT r.id), 0)
    INTO after_registration_count, after_registration_id_sum
  FROM registrations r
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (58, 99, 100, 101, 102, 103, 104, 105, 106);

  SELECT COUNT(DISTINCT attendance.id), COALESCE(SUM(DISTINCT attendance.id), 0)
    INTO after_attendance_count, after_attendance_id_sum
  FROM course_class_attendances attendance
  INNER JOIN registrations r ON r.id = attendance.registration_id
  INNER JOIN course_classes cc ON cc.id = r.class_id
  WHERE cc.course_id IN (58, 99, 100, 101, 102, 103, 104, 105, 106);

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
    9 AS source_program_id,
    program_2026_id,
    source_remaining_count,
    moved_count AS moved_2026_count,
    before_class_count AS verified_class_count,
    before_registration_count AS verified_registration_count,
    before_attendance_count AS verified_attendance_count;
END$$

DELIMITER ;

CALL migrate_training_program_9_to_2026();
DROP PROCEDURE migrate_training_program_9_to_2026;
