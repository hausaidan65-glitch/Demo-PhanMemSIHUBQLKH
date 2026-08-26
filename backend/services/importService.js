const db = require("../config/db");
const bcrypt = require("bcrypt");

const {
  findClassByCourseName,

  findUserByPhone,

  findUserByEmail,

  checkRegistration,
  createUser,

  createRegistration,
} = require("../models/importModel");

async function importStudents(rows) {
  const connection = await db.getConnection();

  let createdUsers = 0;

  let createdRegistrations = 0;

  let failed = [];

  try {
    await connection.beginTransaction();

    for (const item of rows) {
      let user = await findUserByPhone(connection, item.phone);

      if (!user) {
        user = await findUserByEmail(connection, item.email);
      }

      let userId;

      if (user) {
        userId = user.id;
      } else {
        const password = await bcrypt.hash("SIHUB@123456", 10);

        userId = await createUser(connection, item, password);

        createdUsers++;
      }
      const courseNames = Array.isArray(item.course_names)
        ? item.course_names
        : item.course_name
          ? [item.course_name]
          : [];

      if (courseNames.length === 0) {
        failed.push({
          name: item.fullname,
          error: "Không có khóa học hợp lệ",
        });

        continue;
      }

      for (const courseName of courseNames) {
        console.log("COURSE IMPORT:", courseName);

        const classInfo = await findClassByCourseName(connection, courseName);

        console.log("CLASS INFO:", classInfo);

        if (!classInfo) {
          failed.push({
            name: item.fullname,
            course_name: courseName,
            error: `Không tìm thấy lớp phù hợp với khóa: ${courseName}`,
          });

          continue;
        }

        const existedRegistration = await checkRegistration(
          connection,
          userId,
          classInfo.class_id,
        );

        if (existedRegistration) {
          failed.push({
            name: item.fullname,
            course_name: courseName,
            error: "Học viên đã đăng ký lớp này",
          });

          continue;
        }

        await createRegistration(connection, {
          user_id: userId,
          class_id: classInfo.class_id,
          project_field: item.project_field,
          startup_stage: item.startup_stage,
        });

        createdRegistrations++;
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();

    failed.push({
      error: error.message,
    });
  } finally {
    connection.release();
  }
  console.log({
    createdUsers,
    createdRegistrations,
  });
  return {
    createdUsers,

    createdRegistrations,

    failedCount: failed.length,

    failed,
  };
}

module.exports = {
  importStudents,
};
