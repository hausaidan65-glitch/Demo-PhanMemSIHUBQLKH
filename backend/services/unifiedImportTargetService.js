const db = require("../config/db");

async function safeQuery(sql) {
  const [rows] = await db.query(sql);
  return rows;
}

async function getTargetCatalog() {
  const [
    missions,
    programs,
    courses,
    openings,
    startupEventsRaw,
    networkingEventsRaw,
    incubationProgramsRaw,
  ] = await Promise.all([
    safeQuery(`
      SELECT
        id,
        mission_name AS name
      FROM missions
      WHERE status = 'ACTIVE'
      ORDER BY id DESC
    `),

    safeQuery(`
      SELECT
        id,
        program_name AS name,
        year,
        mission_id
      FROM training_programs
      ORDER BY id DESC
    `),

    safeQuery(`
      SELECT
        id,
        course_name AS name,
        program_id
      FROM courses
      WHERE deleted_at IS NULL
      ORDER BY id DESC
    `),

    safeQuery(`
      SELECT
        id,
        class_name AS name,
        course_id,
        organization_start_date AS start_date,
        organization_end_date AS end_date
      FROM course_classes
      WHERE deleted_at IS NULL
      ORDER BY id DESC
    `),

    // Không đoán tên cột thời gian nữa.
    safeQuery(`
      SELECT *
      FROM startup_connection_events
      ORDER BY id DESC
    `),

    safeQuery(`
      SELECT *
      FROM networking_events
      ORDER BY id DESC
    `),

    safeQuery(`
      SELECT *
      FROM incubation_programs
      ORDER BY id DESC
    `),
  ]);

  const startupEvents = startupEventsRaw.map((item) => ({
    id: item.id,
    name: item.event_name,
    type: item.event_type,
    year: item.year ?? null,
    start_date: item.start_datetime ?? item.start_date ?? null,
    end_date: item.end_datetime ?? item.end_date ?? null,
  }));

  const networkingEvents = networkingEventsRaw.map((item) => ({
    id: item.id,
    name: item.event_name,
    year: item.year ?? null,
    start_date: item.start_datetime ?? item.start_date ?? null,
    end_date: item.end_datetime ?? item.end_date ?? null,
  }));

  const incubationPrograms = incubationProgramsRaw.map((item) => ({
    id: item.id,
    name: item.program_name,
    year: item.year ?? null,
    start_date: item.start_date ?? item.start_datetime ?? null,
    end_date: item.end_date ?? item.end_datetime ?? null,
  }));

  return {
    missions,
    programs,
    courses,
    openings,
    startupEvents,
    networkingEvents,
    incubationPrograms,
  };
}

module.exports = {
  getTargetCatalog,
};
