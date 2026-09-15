-- Split the verified 2025 classes out of courses 38 and 124.
-- Safe one-time migration: aborts and rolls back if the audited shape changed.

DROP PROCEDURE IF EXISTS split_final_null_year_courses_to_2025;

DELIMITER $$

CREATE PROCEDURE split_final_null_year_courses_to_2025()
BEGIN
  DECLARE program_17_2025_id INT DEFAULT NULL;
  DECLARE course_38_2025_id INT DEFAULT NULL;
  DECLARE course_124_2025_id INT DEFAULT NULL;
  DECLARE guard_count INT DEFAULT 0;
  DECLARE affected_count INT DEFAULT 0;
  DECLARE before_class_count INT DEFAULT 0;
  DECLARE before_class_id_sum BIGINT DEFAULT 0;
  DECLARE before_class_updated_sum BIGINT DEFAULT 0;
  DECLARE before_registration_count INT DEFAULT 0;
  DECLARE before_registration_id_sum BIGINT DEFAULT 0;
  DECLARE before_participant_count INT DEFAULT 0;
  DECLARE before_session_count INT DEFAULT 0;
  DECLARE before_session_id_sum BIGINT DEFAULT 0;
  DECLARE before_provenance_count INT DEFAULT 0;
  DECLARE before_provenance_id_sum BIGINT DEFAULT 0;
  DECLARE before_attendance_count INT DEFAULT 0;
  DECLARE before_certificate_count INT DEFAULT 0;
  DECLARE before_progress_count INT DEFAULT 0;
  DECLARE before_attachment_count INT DEFAULT 0;
  DECLARE before_email_count INT DEFAULT 0;
  DECLARE before_notification_count INT DEFAULT 0;
  DECLARE before_content_count INT DEFAULT 0;
  DECLARE before_note_count INT DEFAULT 0;
  DECLARE before_assignment_count INT DEFAULT 0;
  DECLARE after_class_count INT DEFAULT 0;
  DECLARE after_class_id_sum BIGINT DEFAULT 0;
  DECLARE after_class_updated_sum BIGINT DEFAULT 0;
  DECLARE after_registration_count INT DEFAULT 0;
  DECLARE after_registration_id_sum BIGINT DEFAULT 0;
  DECLARE after_participant_count INT DEFAULT 0;
  DECLARE after_session_count INT DEFAULT 0;
  DECLARE after_session_id_sum BIGINT DEFAULT 0;
  DECLARE after_provenance_count INT DEFAULT 0;
  DECLARE after_provenance_id_sum BIGINT DEFAULT 0;
  DECLARE after_attendance_count INT DEFAULT 0;
  DECLARE after_certificate_count INT DEFAULT 0;
  DECLARE after_progress_count INT DEFAULT 0;
  DECLARE after_attachment_count INT DEFAULT 0;
  DECLARE after_email_count INT DEFAULT 0;
  DECLARE after_notification_count INT DEFAULT 0;
  DECLARE after_content_count INT DEFAULT 0;
  DECLARE after_note_count INT DEFAULT 0;
  DECLARE after_assignment_count INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT id FROM training_programs WHERE id IN (2,17,18) FOR UPDATE;
  SELECT id FROM courses WHERE id IN (38,124) OR program_id IN (2,17,18) FOR UPDATE;
  SELECT id FROM course_classes
  WHERE course_id IN (38,124)
     OR id IN (102,103,104,105,106,107,108,246,
              257,258,259,260,261,262,263,264,265,266,
              267,268,269,270,271,272,273,274,275,276)
  FOR UPDATE;

  SELECT COUNT(*) INTO guard_count
  FROM training_programs
  WHERE (id IN (2,17) AND year IS NULL) OR (id = 18 AND year = 2025);
  IF guard_count <> 3 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: source programs or reusable program 18 no longer match the audited years.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM training_programs p18
    INNER JOIN training_programs p2 ON p2.id = 2
    WHERE p18.id = 18
      AND NOT (p18.program_name <=> p2.program_name
        AND p18.description <=> p2.description
        AND p18.status <=> p2.status
        AND p18.mission_id <=> p2.mission_id)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: program 18 is not business-compatible with source program 2.';
  END IF;

  SELECT COUNT(*) INTO guard_count
  FROM training_programs candidate
  INNER JOIN training_programs source ON source.id = 17
  WHERE candidate.id <> source.id
    AND candidate.year = 2025
    AND candidate.program_name <=> source.program_name
    AND candidate.description <=> source.description
    AND candidate.status <=> source.status
    AND candidate.mission_id <=> source.mission_id;
  IF guard_count <> 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: a compatible 2025 clone of program 17 already exists.';
  END IF;

  IF (SELECT COUNT(*) FROM courses WHERE id = 38 AND program_id = 2) <> 1
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 38) <> 8
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 38
         AND id IN (102,103,104,105,106,107,108,246)) <> 8 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 38 membership changed since audit.';
  END IF;

  IF (SELECT COUNT(*) FROM courses WHERE id = 124 AND program_id = 17) <> 1
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 124) <> 20
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 124
         AND id IN (257,258,259,260,261,262,263,264,265,266,
                    267,268,269,270,271,272,273,274,275,276)) <> 20 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 124 membership changed since audit.';
  END IF;

  IF (SELECT organization_start_date FROM course_classes WHERE id = 258) <> '0225-08-26'
     OR (SELECT organization_end_date FROM course_classes WHERE id = 258) <> '2025-08-27' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: unresolved class 258 dates changed since audit.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(id),0), COALESCE(SUM(UNIX_TIMESTAMP(updated_at)),0)
    INTO before_class_count, before_class_id_sum, before_class_updated_sum
  FROM course_classes
  WHERE id IN (102,103,104,105,106,107,108,246,
               257,258,259,260,261,262,263,264,265,266,
               267,268,269,270,271,272,273,274,275,276);
  IF before_class_count <> 28 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: expected exactly 28 protected classes.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(id),0), COUNT(DISTINCT user_id)
    INTO before_registration_count, before_registration_id_sum, before_participant_count
  FROM registrations
  WHERE class_id IN (102,103,104,105,106,107,108,246,
                     257,258,259,260,261,262,263,264,265,266,
                     267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*), COALESCE(SUM(id),0)
    INTO before_session_count, before_session_id_sum
  FROM course_class_sessions
  WHERE class_id IN (102,103,104,105,106,107,108,246,
                     257,258,259,260,261,262,263,264,265,266,
                     267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*), COALESCE(SUM(g.id),0)
    INTO before_provenance_count, before_provenance_id_sum
  FROM google_form_import_extras g
  INNER JOIN registrations r ON r.id = g.registration_id
  WHERE r.class_id IN (102,103,104,105,106,107,108,246,
                       257,258,259,260,261,262,263,264,265,266,
                       267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_attendance_count
  FROM course_class_attendances a INNER JOIN registrations r ON r.id = a.registration_id
  WHERE r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_certificate_count
  FROM course_certificates c INNER JOIN registrations r ON r.id = c.registration_id
  WHERE r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_progress_count FROM course_class_progress_reports
  WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_attachment_count
  FROM progress_attachments a INNER JOIN course_class_progress_reports p
    ON p.id = a.progress_report_id AND a.progress_type = 'TRAINING'
  WHERE p.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_email_count
  FROM email_logs e INNER JOIN registrations r ON r.id = e.registration_id
  WHERE r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(DISTINCT n.id) INTO before_notification_count
  FROM notifications n LEFT JOIN registrations r ON r.id = n.registration_id
  WHERE n.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276)
     OR r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_content_count FROM class_contents
  WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_note_count FROM course_class_notes
  WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO before_assignment_count FROM admin_class_assignments
  WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);

  INSERT INTO courses
    (program_id, course_name, slug, short_description, description, thumbnail,
     duration, target_audience, learning_outcomes, mission, mission_id, status,
     created_at, updated_at, deleted_at, deleted_by)
  SELECT
    18, course_name, slug, short_description, description, thumbnail,
    duration, target_audience, learning_outcomes, mission, mission_id, status,
    created_at, updated_at, deleted_at, deleted_by
  FROM courses WHERE id = 38;
  SET course_38_2025_id = LAST_INSERT_ID();

  INSERT INTO training_programs
    (program_name, description, status, created_at, updated_at, mission_id, year)
  SELECT program_name, description, status, created_at, updated_at, mission_id, 2025
  FROM training_programs WHERE id = 17;
  SET program_17_2025_id = LAST_INSERT_ID();

  INSERT INTO courses
    (program_id, course_name, slug, short_description, description, thumbnail,
     duration, target_audience, learning_outcomes, mission, mission_id, status,
     created_at, updated_at, deleted_at, deleted_by)
  SELECT
    program_17_2025_id, course_name, slug, short_description, description, thumbnail,
    duration, target_audience, learning_outcomes, mission, mission_id, status,
    created_at, updated_at, deleted_at, deleted_by
  FROM courses WHERE id = 124;
  SET course_124_2025_id = LAST_INSERT_ID();

  UPDATE course_classes SET course_id = course_38_2025_id, updated_at = updated_at
  WHERE course_id = 38 AND id IN (107,246);
  SET affected_count = ROW_COUNT();
  IF affected_count <> 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 38 did not move exactly two approved classes.';
  END IF;

  UPDATE course_classes SET course_id = course_124_2025_id, updated_at = updated_at
  WHERE course_id = 124
    AND id IN (257,259,260,261,262,263,264,265,266,267,
               268,269,270,271,272,273,274,275,276);
  SET affected_count = ROW_COUNT();
  IF affected_count <> 19 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: course 124 did not move exactly 19 approved classes.';
  END IF;

  IF (SELECT COUNT(*) FROM course_classes WHERE course_id = 38 AND id IN (102,103,104,105,106,108)) <> 6
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 38) <> 6
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = course_38_2025_id AND id IN (107,246)) <> 2
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = course_38_2025_id) <> 2
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 124 AND id = 258) <> 1
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = 124) <> 1
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = course_124_2025_id
         AND id IN (257,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276)) <> 19
     OR (SELECT COUNT(*) FROM course_classes WHERE course_id = course_124_2025_id) <> 19 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: final resolved/unresolved class memberships are incorrect.';
  END IF;

  IF (SELECT organization_start_date FROM course_classes WHERE id = 258) <> '0225-08-26'
     OR (SELECT organization_end_date FROM course_classes WHERE id = 258) <> '2025-08-27' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: class 258 dates changed unexpectedly.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM courses clone INNER JOIN courses source ON source.id = 38
    WHERE clone.id = course_38_2025_id AND NOT (
      clone.course_name <=> source.course_name AND clone.slug <=> source.slug
      AND clone.short_description <=> source.short_description AND clone.description <=> source.description
      AND clone.thumbnail <=> source.thumbnail AND clone.duration <=> source.duration
      AND clone.target_audience <=> source.target_audience AND clone.learning_outcomes <=> source.learning_outcomes
      AND clone.mission <=> source.mission AND clone.mission_id <=> source.mission_id
      AND clone.status <=> source.status AND clone.created_at <=> source.created_at
      AND clone.updated_at <=> source.updated_at AND clone.deleted_at <=> source.deleted_at
      AND clone.deleted_by <=> source.deleted_by)
  ) OR EXISTS (
    SELECT 1 FROM courses clone INNER JOIN courses source ON source.id = 124
    WHERE clone.id = course_124_2025_id AND NOT (
      clone.course_name <=> source.course_name AND clone.slug <=> source.slug
      AND clone.short_description <=> source.short_description AND clone.description <=> source.description
      AND clone.thumbnail <=> source.thumbnail AND clone.duration <=> source.duration
      AND clone.target_audience <=> source.target_audience AND clone.learning_outcomes <=> source.learning_outcomes
      AND clone.mission <=> source.mission AND clone.mission_id <=> source.mission_id
      AND clone.status <=> source.status AND clone.created_at <=> source.created_at
      AND clone.updated_at <=> source.updated_at AND clone.deleted_at <=> source.deleted_at
      AND clone.deleted_by <=> source.deleted_by)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: cloned course business/Mission/timestamp fields differ from source.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM training_programs clone INNER JOIN training_programs source ON source.id = 17
    WHERE clone.id = program_17_2025_id AND NOT (
      clone.program_name <=> source.program_name AND clone.description <=> source.description
      AND clone.status <=> source.status AND clone.created_at <=> source.created_at
      AND clone.updated_at <=> source.updated_at AND clone.mission_id <=> source.mission_id
      AND clone.year = 2025)
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: cloned program 17 business/Mission/timestamp fields differ from source.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(id),0), COALESCE(SUM(UNIX_TIMESTAMP(updated_at)),0)
    INTO after_class_count, after_class_id_sum, after_class_updated_sum
  FROM course_classes
  WHERE id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*), COALESCE(SUM(id),0), COUNT(DISTINCT user_id)
    INTO after_registration_count, after_registration_id_sum, after_participant_count
  FROM registrations
  WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*), COALESCE(SUM(id),0) INTO after_session_count, after_session_id_sum
  FROM course_class_sessions
  WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*), COALESCE(SUM(g.id),0) INTO after_provenance_count, after_provenance_id_sum
  FROM google_form_import_extras g INNER JOIN registrations r ON r.id = g.registration_id
  WHERE r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_attendance_count FROM course_class_attendances a INNER JOIN registrations r ON r.id=a.registration_id WHERE r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_certificate_count FROM course_certificates c INNER JOIN registrations r ON r.id=c.registration_id WHERE r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_progress_count FROM course_class_progress_reports WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_attachment_count FROM progress_attachments a INNER JOIN course_class_progress_reports p ON p.id=a.progress_report_id AND a.progress_type='TRAINING' WHERE p.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_email_count FROM email_logs e INNER JOIN registrations r ON r.id=e.registration_id WHERE r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(DISTINCT n.id) INTO after_notification_count FROM notifications n LEFT JOIN registrations r ON r.id=n.registration_id WHERE n.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276) OR r.class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_content_count FROM class_contents WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_note_count FROM course_class_notes WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);
  SELECT COUNT(*) INTO after_assignment_count FROM admin_class_assignments WHERE class_id IN (102,103,104,105,106,107,108,246,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276);

  IF before_class_count <> after_class_count OR before_class_id_sum <> after_class_id_sum OR before_class_updated_sum <> after_class_updated_sum
     OR before_registration_count <> after_registration_count OR before_registration_id_sum <> after_registration_id_sum OR before_participant_count <> after_participant_count
     OR before_session_count <> after_session_count OR before_session_id_sum <> after_session_id_sum
     OR before_provenance_count <> after_provenance_count OR before_provenance_id_sum <> after_provenance_id_sum
     OR before_attendance_count <> after_attendance_count OR before_certificate_count <> after_certificate_count
     OR before_progress_count <> after_progress_count OR before_attachment_count <> after_attachment_count
     OR before_email_count <> after_email_count OR before_notification_count <> after_notification_count
     OR before_content_count <> after_content_count OR before_note_count <> after_note_count
     OR before_assignment_count <> after_assignment_count THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Migration aborted: protected IDs/counts/participants/downstream relationships changed.';
  END IF;

  COMMIT;

  SELECT 18 AS reused_program_2025_id, course_38_2025_id,
         program_17_2025_id, course_124_2025_id,
         before_class_count AS verified_classes,
         before_registration_count AS verified_registrations,
         before_participant_count AS verified_participants,
         before_session_count AS verified_sessions,
         before_provenance_count AS verified_provenance;
END$$

DELIMITER ;

CALL split_final_null_year_courses_to_2025();
DROP PROCEDURE split_final_null_year_courses_to_2025;
