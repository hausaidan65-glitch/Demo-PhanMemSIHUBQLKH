-- Split courses.id = 90 into year-specific courses under year-specific program 1 clones.
-- Safe one-time migration: aborts and rolls back if the verified source shape changed.

DROP PROCEDURE IF EXISTS split_course_90_by_year;

DELIMITER $$

CREATE PROCEDURE split_course_90_by_year()
BEGIN
  DECLARE program_2025_id INT DEFAULT NULL;
  DECLARE program_2026_id INT DEFAULT NULL;
  DECLARE course_2026_id INT DEFAULT NULL;
  DECLARE affected_count INT DEFAULT 0;
  DECLARE guard_count INT DEFAULT 0;
  DECLARE before_class_updated_sum BIGINT DEFAULT 0;
  DECLARE after_class_updated_sum BIGINT DEFAULT 0;
  DECLARE before_session_count INT DEFAULT 0;
  DECLARE before_session_id_sum BIGINT DEFAULT 0;
  DECLARE before_registration_count INT DEFAULT 0;
  DECLARE before_registration_id_sum BIGINT DEFAULT 0;
  DECLARE before_user_count INT DEFAULT 0;
  DECLARE before_attendance_count INT DEFAULT 0;
  DECLARE before_attendance_id_sum BIGINT DEFAULT 0;
  DECLARE before_certificate_count INT DEFAULT 0;
  DECLARE before_certificate_id_sum BIGINT DEFAULT 0;
  DECLARE before_email_count INT DEFAULT 0;
  DECLARE before_email_id_sum BIGINT DEFAULT 0;
  DECLARE before_notification_count INT DEFAULT 0;
  DECLARE before_notification_id_sum BIGINT DEFAULT 0;
  DECLARE before_progress_count INT DEFAULT 0;
  DECLARE before_progress_id_sum BIGINT DEFAULT 0;
  DECLARE before_attachment_count INT DEFAULT 0;
  DECLARE before_attachment_id_sum BIGINT DEFAULT 0;
  DECLARE after_session_count INT DEFAULT 0;
  DECLARE after_session_id_sum BIGINT DEFAULT 0;
  DECLARE after_registration_count INT DEFAULT 0;
  DECLARE after_registration_id_sum BIGINT DEFAULT 0;
  DECLARE after_user_count INT DEFAULT 0;
  DECLARE after_attendance_count INT DEFAULT 0;
  DECLARE after_attendance_id_sum BIGINT DEFAULT 0;
  DECLARE after_certificate_count INT DEFAULT 0;
  DECLARE after_certificate_id_sum BIGINT DEFAULT 0;
  DECLARE after_email_count INT DEFAULT 0;
  DECLARE after_email_id_sum BIGINT DEFAULT 0;
  DECLARE after_notification_count INT DEFAULT 0;
  DECLARE after_notification_id_sum BIGINT DEFAULT 0;
  DECLARE after_progress_count INT DEFAULT 0;
  DECLARE after_progress_id_sum BIGINT DEFAULT 0;
  DECLARE after_attachment_count INT DEFAULT 0;
  DECLARE after_attachment_id_sum BIGINT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO guard_count
  FROM training_programs
  WHERE id = 1 AND year IS NULL
  FOR UPDATE;

  IF guard_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: source program 1 is missing or year is not NULL.';
  END IF;

  SELECT id FROM courses WHERE program_id = 1 OR id = 90 FOR UPDATE;
  SELECT id FROM course_classes WHERE course_id = 90 OR id IN (192, 206, 207, 208) FOR UPDATE;

  SELECT COUNT(*) INTO guard_count FROM courses WHERE program_id = 1;
  IF guard_count <> 15 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: program 1 no longer has the verified 15 courses.';
  END IF;

  SELECT COUNT(*) INTO guard_count
  FROM courses
  WHERE id = 90
    AND program_id = 1
    AND slug = 'quan-tri-du-an-chuyen-nghiep'
    AND deleted_at IS NULL;
  IF guard_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 90 no longer matches the verified source.';
  END IF;

  SELECT COUNT(*) INTO guard_count
  FROM course_classes
  WHERE course_id = 90
    AND id IN (192, 206, 207, 208);
  IF guard_count <> 4 OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 90) <> 4 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 90 class membership does not match the approved 4 IDs.';
  END IF;

  SELECT COUNT(*) INTO guard_count
  FROM training_programs candidate
  INNER JOIN training_programs source
    ON source.id = 1 AND candidate.program_name = source.program_name
  WHERE candidate.id <> source.id AND candidate.year IN (2025, 2026);
  IF guard_count <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: a 2025/2026 clone of program 1 already exists.';
  END IF;

  SELECT COUNT(*) INTO guard_count
  FROM courses
  WHERE slug = 'quan-tri-du-an-chuyen-nghiep-2026';
  IF guard_count <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: target 2026 course slug already exists.';
  END IF;

  SELECT COALESCE(SUM(UNIX_TIMESTAMP(updated_at)), 0)
    INTO before_class_updated_sum
  FROM course_classes WHERE id IN (192, 206, 207, 208);

  SELECT COUNT(*), COALESCE(SUM(id), 0)
    INTO before_session_count, before_session_id_sum
  FROM course_class_sessions WHERE class_id IN (192, 206, 207, 208);

  SELECT COUNT(*), COALESCE(SUM(id), 0), COUNT(DISTINCT user_id)
    INTO before_registration_count, before_registration_id_sum, before_user_count
  FROM registrations WHERE class_id IN (192, 206, 207, 208);

  SELECT COUNT(*), COALESCE(SUM(a.id), 0)
    INTO before_attendance_count, before_attendance_id_sum
  FROM course_class_attendances a
  INNER JOIN registrations r ON r.id = a.registration_id
  WHERE r.class_id IN (192, 206, 207, 208);

  SELECT COUNT(*), COALESCE(SUM(cert.id), 0)
    INTO before_certificate_count, before_certificate_id_sum
  FROM course_certificates cert
  INNER JOIN registrations r ON r.id = cert.registration_id
  WHERE r.class_id IN (192, 206, 207, 208);

  SELECT COUNT(*), COALESCE(SUM(email.id), 0)
    INTO before_email_count, before_email_id_sum
  FROM email_logs email
  INNER JOIN registrations r ON r.id = email.registration_id
  WHERE r.class_id IN (192, 206, 207, 208);

  SELECT COUNT(DISTINCT notification.id), COALESCE(SUM(DISTINCT notification.id), 0)
    INTO before_notification_count, before_notification_id_sum
  FROM notifications notification
  LEFT JOIN registrations r ON r.id = notification.registration_id
  WHERE notification.class_id IN (192, 206, 207, 208)
     OR r.class_id IN (192, 206, 207, 208);

  SELECT COUNT(*), COALESCE(SUM(id), 0)
    INTO before_progress_count, before_progress_id_sum
  FROM course_class_progress_reports WHERE class_id IN (192, 206, 207, 208);

  SELECT COUNT(*), COALESCE(SUM(attachment.id), 0)
    INTO before_attachment_count, before_attachment_id_sum
  FROM progress_attachments attachment
  INNER JOIN course_class_progress_reports progress
    ON progress.id = attachment.progress_report_id
   AND attachment.progress_type = 'TRAINING'
  WHERE progress.class_id IN (192, 206, 207, 208);

  INSERT INTO training_programs
    (program_name, description, status, created_at, updated_at, mission_id, year)
  SELECT program_name, description, status, created_at, updated_at, mission_id, 2025
  FROM training_programs WHERE id = 1;
  SET program_2025_id = LAST_INSERT_ID();

  INSERT INTO training_programs
    (program_name, description, status, created_at, updated_at, mission_id, year)
  SELECT program_name, description, status, created_at, updated_at, mission_id, 2026
  FROM training_programs WHERE id = 1;
  SET program_2026_id = LAST_INSERT_ID();

  UPDATE courses
  SET program_id = program_2025_id,
      updated_at = updated_at
  WHERE id = 90 AND program_id = 1;
  SET affected_count = ROW_COUNT();
  IF affected_count <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: existing course 90 was not moved exactly once.';
  END IF;

  INSERT INTO courses
    (program_id, course_name, slug, short_description, description, thumbnail,
     duration, target_audience, learning_outcomes, mission, mission_id, status,
     created_at, updated_at, deleted_at, deleted_by)
  SELECT
    program_2026_id, course_name, 'quan-tri-du-an-chuyen-nghiep-2026',
    short_description, description, thumbnail, duration, target_audience,
    learning_outcomes, mission, mission_id, status, created_at, updated_at,
    deleted_at, deleted_by
  FROM courses WHERE id = 90;
  SET course_2026_id = LAST_INSERT_ID();

  UPDATE course_classes
  SET course_id = course_2026_id,
      updated_at = updated_at
  WHERE course_id = 90 AND id IN (206, 207, 208);
  SET affected_count = ROW_COUNT();
  IF affected_count <> 3 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: expected to reassign exactly 3 classes into 2026.';
  END IF;

  IF (SELECT COUNT(*) FROM course_classes WHERE course_id = 90 AND id = 192) <> 1
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = course_2026_id AND id IN (206,207,208)) <> 3 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: final class-to-course assignments are incorrect.';
  END IF;

  IF (SELECT COUNT(*) FROM courses WHERE program_id = 1) <> 14 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: source program 1 did not retain exactly 14 undated courses.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM training_programs clone
    INNER JOIN training_programs source ON source.id = 1
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
      SET MESSAGE_TEXT = 'Migration aborted: cloned program fields do not match source program 1.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM courses clone
    INNER JOIN courses source ON source.id = 90
    WHERE clone.id = course_2026_id
      AND NOT (
        clone.course_name <=> source.course_name
        AND clone.short_description <=> source.short_description
        AND clone.description <=> source.description
        AND clone.thumbnail <=> source.thumbnail
        AND clone.duration <=> source.duration
        AND clone.target_audience <=> source.target_audience
        AND clone.learning_outcomes <=> source.learning_outcomes
        AND clone.mission <=> source.mission
        AND clone.mission_id <=> source.mission_id
        AND clone.status <=> source.status
        AND clone.created_at <=> source.created_at
        AND clone.updated_at <=> source.updated_at
        AND clone.deleted_at <=> source.deleted_at
        AND clone.deleted_by <=> source.deleted_by
      )
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: cloned course fields do not match course 90.';
  END IF;

  SELECT COALESCE(SUM(UNIX_TIMESTAMP(updated_at)), 0)
    INTO after_class_updated_sum
  FROM course_classes WHERE id IN (192, 206, 207, 208);
  SELECT COUNT(*), COALESCE(SUM(id), 0)
    INTO after_session_count, after_session_id_sum
  FROM course_class_sessions WHERE class_id IN (192, 206, 207, 208);
  SELECT COUNT(*), COALESCE(SUM(id), 0), COUNT(DISTINCT user_id)
    INTO after_registration_count, after_registration_id_sum, after_user_count
  FROM registrations WHERE class_id IN (192, 206, 207, 208);
  SELECT COUNT(*), COALESCE(SUM(a.id), 0)
    INTO after_attendance_count, after_attendance_id_sum
  FROM course_class_attendances a INNER JOIN registrations r ON r.id = a.registration_id
  WHERE r.class_id IN (192, 206, 207, 208);
  SELECT COUNT(*), COALESCE(SUM(cert.id), 0)
    INTO after_certificate_count, after_certificate_id_sum
  FROM course_certificates cert INNER JOIN registrations r ON r.id = cert.registration_id
  WHERE r.class_id IN (192, 206, 207, 208);
  SELECT COUNT(*), COALESCE(SUM(email.id), 0)
    INTO after_email_count, after_email_id_sum
  FROM email_logs email INNER JOIN registrations r ON r.id = email.registration_id
  WHERE r.class_id IN (192, 206, 207, 208);
  SELECT COUNT(DISTINCT notification.id), COALESCE(SUM(DISTINCT notification.id), 0)
    INTO after_notification_count, after_notification_id_sum
  FROM notifications notification LEFT JOIN registrations r ON r.id = notification.registration_id
  WHERE notification.class_id IN (192, 206, 207, 208)
     OR r.class_id IN (192, 206, 207, 208);
  SELECT COUNT(*), COALESCE(SUM(id), 0)
    INTO after_progress_count, after_progress_id_sum
  FROM course_class_progress_reports WHERE class_id IN (192, 206, 207, 208);
  SELECT COUNT(*), COALESCE(SUM(attachment.id), 0)
    INTO after_attachment_count, after_attachment_id_sum
  FROM progress_attachments attachment
  INNER JOIN course_class_progress_reports progress
    ON progress.id = attachment.progress_report_id
   AND attachment.progress_type = 'TRAINING'
  WHERE progress.class_id IN (192, 206, 207, 208);

  IF before_class_updated_sum <> after_class_updated_sum
     OR before_session_count <> after_session_count OR before_session_id_sum <> after_session_id_sum
     OR before_registration_count <> after_registration_count OR before_registration_id_sum <> after_registration_id_sum
     OR before_user_count <> after_user_count
     OR before_attendance_count <> after_attendance_count OR before_attendance_id_sum <> after_attendance_id_sum
     OR before_certificate_count <> after_certificate_count OR before_certificate_id_sum <> after_certificate_id_sum
     OR before_email_count <> after_email_count OR before_email_id_sum <> after_email_id_sum
     OR before_notification_count <> after_notification_count OR before_notification_id_sum <> after_notification_id_sum
     OR before_progress_count <> after_progress_count OR before_progress_id_sum <> after_progress_id_sum
     OR before_attachment_count <> after_attachment_count OR before_attachment_id_sum <> after_attachment_id_sum THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: protected class or downstream relationships changed.';
  END IF;

  COMMIT;

  SELECT 1 AS source_program_id, program_2025_id, program_2026_id,
         90 AS course_2025_id, course_2026_id,
         before_registration_count AS verified_registrations,
         before_user_count AS verified_distinct_participants,
         before_session_count AS verified_sessions,
         before_attendance_count AS verified_attendance;
END$$

DELIMITER ;

CALL split_course_90_by_year();
DROP PROCEDURE split_course_90_by_year;
