-- Add the business year owned by each training program.
-- Existing rows are intentionally left NULL.

SET @training_program_year_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'training_programs'
    AND column_name = 'year'
);

SET @add_training_program_year_sql = IF(
  @training_program_year_column_exists = 0,
  'ALTER TABLE `training_programs` ADD COLUMN `year` INT NULL',
  'SELECT ''training_programs.year already exists'' AS message'
);

PREPARE add_training_program_year_statement
  FROM @add_training_program_year_sql;
EXECUTE add_training_program_year_statement;
DEALLOCATE PREPARE add_training_program_year_statement;

SET @training_program_year_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'training_programs'
    AND index_name = 'idx_training_program_year'
);

SET @add_training_program_year_index_sql = IF(
  @training_program_year_index_exists = 0,
  'CREATE INDEX `idx_training_program_year` ON `training_programs` (`year`)',
  'SELECT ''idx_training_program_year already exists'' AS message'
);

PREPARE add_training_program_year_index_statement
  FROM @add_training_program_year_index_sql;
EXECUTE add_training_program_year_index_statement;
DEALLOCATE PREPARE add_training_program_year_index_statement;
