CREATE TABLE IF NOT EXISTS course_class_surveys (
  id INT NOT NULL AUTO_INCREMENT,

  class_id INT NOT NULL,

  q1_content_meets_objective VARCHAR(32) NOT NULL,
  q2_materials_clear_useful VARCHAR(32) NOT NULL,
  q3_knowledge_practical VARCHAR(32) NULL,
  q4_trainer_expertise VARCHAR(32) NULL,
  q5_trainer_delivery VARCHAR(32) NULL,
  q6_trainer_support VARCHAR(32) NULL,
  q7_duration VARCHAR(32) NULL,

  q8_most_satisfied TEXT NULL,
  q9_improvement TEXT NULL,
  q10_next_course_suggestion TEXT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_course_class_surveys_class_id (class_id),
  CONSTRAINT fk_course_class_surveys_class
    FOREIGN KEY (class_id)
    REFERENCES course_classes (id)
    ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
