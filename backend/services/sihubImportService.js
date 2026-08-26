const db = require("../config/db");

const ImportModel = require("../models/importModel");
const fs = require("fs");
function normalizeCourseName(name) {
  if (!name) return "";

  return name
    .replace(/^lớp\s*/i, "")
    .replace(/^khóa\s*/i, "")
    .trim();
}
// =====================================
// Tạo slug đơn giản
// =====================================

function createSlug(text) {
  if (!text) return null;

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function cleanValue(value) {
  const result = String(value ?? "").trim();

  return result || null;
}
function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}
function normalizeEmail(value) {
  const email = cleanValue(value);

  if (!email) return null;

  return email.toLowerCase();
}

function normalizePhone(value) {
  const phone = cleanValue(value);

  if (!phone) return null;

  /*
   * Chuẩn hóa khoảng trắng, dấu chấm, dấu gạch...
   *
   * Ví dụ:
   * 093 2788486
   * -> 0932788486
   */
  const digitGroups = phone.match(/\d+/g);

  if (!digitGroups || digitGroups.length === 0) {
    return null;
  }

  /*
   * Trường hợp Excel ghi:
   *
   * 0908436618/zalo 0888841256
   *
   * Đây thực chất là 2 SĐT.
   * Tạm lấy SĐT đầu tiên làm số chính.
   */
  const possiblePhones = phone.match(/0\d[\d\s.-]{7,}/g);

  if (possiblePhones && possiblePhones.length > 0) {
    return possiblePhones[0].replace(/\D/g, "");
  }

  return phone.replace(/\D/g, "");
}

function createImportError(message, code, details = {}) {
  const error = new Error(message);

  error.status = 422;
  error.code = code;
  error.details = details;

  return error;
}
async function createUniqueCourseSlug(connection, baseSlug, programId) {
  const existedByBaseSlug = await ImportModel.findCourseBySlug(
    connection,
    baseSlug,
  );

  if (!existedByBaseSlug) {
    return baseSlug;
  }

  /*
   * Thử slug có thêm mã chương trình.
   * Ví dụ:
   * ky-nang-thuyet-trinh-chuyen-nghiep-1
   */
  const programSlug = `${baseSlug}-program-${programId}`;

  const existedByProgramSlug = await ImportModel.findCourseBySlug(
    connection,
    programSlug,
  );

  if (!existedByProgramSlug) {
    return programSlug;
  }

  /*
   * Nếu vẫn trùng thì tăng số thứ tự.
   */
  let index = 2;

  while (index <= 1000) {
    const candidate = `${programSlug}-${index}`;

    const existed = await ImportModel.findCourseBySlug(connection, candidate);

    if (!existed) {
      return candidate;
    }

    index += 1;
  }

  throw new Error("Không thể tạo slug duy nhất cho khóa học.");
}
function isEventImportType(importType) {
  return ["STARTUP_EXHIBITION", "STARTUP_SEMINAR", "NETWORKING_EVENT"].includes(
    importType,
  );
}

function getStartupEventType(importType) {
  if (importType === "STARTUP_EXHIBITION") {
    return "EXHIBITION";
  }

  if (importType === "STARTUP_SEMINAR") {
    return "SEMINAR";
  }

  return null;
}

async function findEventByName(connection, data) {
  const eventName = cleanValue(data.event?.eventName);

  if (!eventName) {
    return null;
  }

  if (data.importType === "NETWORKING_EVENT") {
    const [rows] = await connection.query(`
      SELECT *
      FROM networking_events
      ORDER BY id ASC
    `);

    return (
      rows.find(
        (item) => normalizeText(item.event_name) === normalizeText(eventName),
      ) || null
    );
  }

  const eventType = getStartupEventType(data.importType);

  const [rows] = await connection.query(
    `
      SELECT *
      FROM startup_connection_events
      WHERE event_type = ?
      ORDER BY id ASC
    `,
    [eventType],
  );

  return (
    rows.find(
      (item) => normalizeText(item.event_name) === normalizeText(eventName),
    ) || null
  );
}

async function findParentExhibition(connection, parentName) {
  if (!parentName) {
    return null;
  }

  const [rows] = await connection.query(`
    SELECT id, event_name
    FROM startup_connection_events
    WHERE event_type = 'EXHIBITION'
    ORDER BY id ASC
  `);

  return (
    rows.find(
      (item) => normalizeText(item.event_name) === normalizeText(parentName),
    ) || null
  );
}
async function resolveEventUser(connection, participant, studentIndex, data) {
  const fullname = cleanValue(participant.fullname);
  const email = normalizeEmail(participant.email);
  const phone = normalizePhone(participant.phone);

  const organization = cleanValue(participant.organization);
  const position = cleanValue(participant.position);

  if (!fullname) {
    throw createImportError(
      "Người tham dự chưa có họ và tên.",
      "EVENT_PARTICIPANT_NAME_REQUIRED",
      {
        studentIndex: studentIndex + 1,
        sheetName: data.sheetName,
      },
    );
  }

  if (!email && !phone) {
    throw createImportError(
      `Người tham dự "${fullname}" chưa có SĐT hoặc email.`,
      "EVENT_PARTICIPANT_CONTACT_REQUIRED",
      {
        studentIndex: studentIndex + 1,
        sheetName: data.sheetName,
        fullname,
      },
    );
  }

  const userByEmail = email
    ? await ImportModel.findUserByEmail(connection, email)
    : null;

  const userByPhone = phone
    ? await ImportModel.findUserByPhone(connection, phone)
    : null;

  // Email một người - SĐT người khác
  if (
    userByEmail &&
    userByPhone &&
    Number(userByEmail.id) !== Number(userByPhone.id)
  ) {
    throw createImportError(
      `Người tham dự "${fullname}" có email và SĐT thuộc hai hồ sơ khác nhau.`,
      "STUDENT_IDENTITY_CONFLICT",
      {
        studentIndex: studentIndex + 1,
        sheetName: data.sheetName,

        fullname,
        email,
        phone,

        emailUserId: userByEmail.id,
        emailUserName: userByEmail.fullname,

        phoneUserId: userByPhone.id,
        phoneUserName: userByPhone.fullname,
      },
    );
  }

  // SĐT có rồi nhưng email khác
  if (
    !userByEmail &&
    userByPhone &&
    email &&
    userByPhone.email &&
    String(userByPhone.email).trim().toLowerCase() !== email
  ) {
    throw createImportError(
      "Số điện thoại đã thuộc một người khác nhưng email không khớp.",
      "STUDENT_PHONE_CONFLICT",
      {
        studentIndex: studentIndex + 1,
        sheetName: data.sheetName,

        fullname,
        email,
        phone,

        phoneUserId: userByPhone.id,
        phoneUserName: userByPhone.fullname,
        phoneUserEmail: userByPhone.email,
      },
    );
  }

  const existedUser = userByEmail || userByPhone;

  if (existedUser) {
    return {
      userId: existedUser.id,
      created: false,
      organization,
      position,
    };
  }

  /*
   * DB của em:
   * users.phone NOT NULL + UNIQUE
   *
   * Không tạo SĐT giả.
   */
  // if (!phone) {
  //   throw createImportError(
  //     `Người tham dự mới "${fullname}" chưa có số điện thoại.`,
  //     "EVENT_PARTICIPANT_PHONE_REQUIRED",
  //     {
  //       studentIndex: studentIndex + 1,
  //       sheetName: data.sheetName,

  //       fullname,
  //       email,
  //       phone,
  //     },
  //   );
  // }

  const [result] = await connection.query(
    `
      INSERT INTO users
      (
        fullname,
        phone,
        email,
        gender,
        company,
        position,
        user_type,
        password,
        role
      )
      VALUES (?, ?, ?, 'OTHER', ?, ?, 'OTHER', '', 'USER')
    `,
    [fullname, phone, email, organization, position],
  );

  return {
    userId: result.insertId,
    created: true,
    organization,
    position,
  };
}
async function importEventItem(data) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const eventName = cleanValue(data.event?.eventName);

    if (!eventName) {
      throw createImportError(
        "Không đọc được tên sự kiện.",
        "EVENT_NAME_REQUIRED",
        {
          fileName: data.fileName,
          sheetName: data.sheetName,
        },
      );
    }

    /*
     * Hội thảo bắt buộc phải xác định Triển lãm cha.
     */
    if (
      data.importType === "STARTUP_SEMINAR" &&
      data.requiresExhibitionParent === true &&
      data.needParentConfirm
    ) {
      throw createImportError(
        "Hội thảo chưa được xác nhận Triển lãm cha.",
        "EVENT_PARENT_CONFIRM_REQUIRED",
        {
          sheetName: data.sheetName,
          eventName,
        },
      );
    }

    let event = await findEventByName(connection, data);

    let eventId = event?.id || null;

    let createdEvent = false;

    let parentEventId = null;

    // =============================
    // HỘI THẢO → TRIỂN LÃM CHA
    // =============================

    if (
      data.importType === "STARTUP_SEMINAR" &&
      data.requiresExhibitionParent === true
    ) {
      const parentName =
        cleanValue(data.event?.parentEventName) ||
        cleanValue(data.parentMatch?.parentEventName);

      if (!parentName) {
        throw createImportError(
          "Hội thảo chưa xác định được Triển lãm cha.",
          "EVENT_PARENT_REQUIRED",
          {
            sheetName: data.sheetName,
            eventName,
          },
        );
      }

      const parent = await findParentExhibition(connection, parentName);

      if (!parent) {
        throw createImportError(
          `Chưa tìm thấy Triển lãm "${parentName}". Hãy import Triển lãm trước.`,
          "EVENT_PARENT_NOT_FOUND",
          {
            sheetName: data.sheetName,
            eventName,
            parentEventName: parentName,
          },
        );
      }

      parentEventId = parent.id;
    }

    // =============================
    // TẠO EVENT NẾU CHƯA CÓ
    // =============================

    if (!eventId) {
      if (data.importType === "NETWORKING_EVENT") {
        const [result] = await connection.query(
          `
            INSERT INTO networking_events
            (
              event_name,
              location,
              year,
              organizer,
              max_participants,
              current_participants,
              status
            )
            VALUES (?, ?, ?, 'SIHUB', 0, 0, 'OPEN')
          `,
          [
            eventName,
            cleanValue(data.event?.location),
            Number(
              String(data.event?.schedule || "").match(/\b20\d{2}\b/)?.[0],
            ) || null,
          ],
        );

        eventId = result.insertId;
      } else {
        const [result] = await connection.query(
          `
            INSERT INTO startup_connection_events
            (
              event_name,
              event_type,
              parent_event_id,
              location,
              year,
              organizer,
              max_participants,
              current_participants,
              status
            )
            VALUES (?, ?, ?, ?, ?, 'SIHUB', 0, 0, 'OPEN')
          `,
          [
            eventName,
            getStartupEventType(data.importType),
            parentEventId,
            cleanValue(data.event?.location),

            Number(
              String(data.event?.schedule || "").match(/\b20\d{2}\b/)?.[0],
            ) || null,
          ],
        );

        eventId = result.insertId;
      }

      createdEvent = true;
    }

    const participants = Array.isArray(data.students) ? data.students : [];

    if (participants.length === 0) {
      throw createImportError(
        "Sheet không còn người tham dự để import.",
        "EMPTY_PARTICIPANT_LIST",
        {
          sheetName: data.sheetName,
        },
      );
    }

    let createdUsers = 0;
    let existedUsers = 0;

    let createdRegistrations = 0;
    let existedRegistrations = 0;

    const participantTable =
      data.importType === "NETWORKING_EVENT"
        ? "networking_event_participants"
        : "startup_connection_participants";

    for (
      let studentIndex = 0;
      studentIndex < participants.length;
      studentIndex += 1
    ) {
      const participant = participants[studentIndex];

      const resolved = await resolveEventUser(
        connection,
        participant,
        studentIndex,
        data,
      );

      if (resolved.created) {
        createdUsers += 1;
      } else {
        existedUsers += 1;
      }

      const [existing] = await connection.query(
        `
          SELECT id
          FROM ${participantTable}
          WHERE event_id = ?
            AND user_id = ?
          LIMIT 1
        `,
        [eventId, resolved.userId],
      );

      if (existing.length > 0) {
        existedRegistrations += 1;
        continue;
      }

      await connection.query(
        `
          INSERT INTO ${participantTable}
          (
            event_id,
            user_id,
            participant_role,
            organization,
            position,
            registration_status
          )
          VALUES (?, ?, ?, ?, ?, 'CONFIRMED')
        `,
        [
          eventId,
          resolved.userId,
          "Khách tham dự",
          resolved.organization,
          resolved.position,
        ],
      );

      createdRegistrations += 1;
    }

    // =============================
    // CẬP NHẬT SỐ NGƯỜI
    // =============================

    if (data.importType === "NETWORKING_EVENT") {
      await connection.query(
        `
          UPDATE networking_events e

          SET e.current_participants = (
            SELECT COUNT(*)
            FROM networking_event_participants p
            WHERE p.event_id = e.id
          )

          WHERE e.id = ?
        `,
        [eventId],
      );
    } else {
      await connection.query(
        `
          UPDATE startup_connection_events e

          SET e.current_participants = (
            SELECT COUNT(*)
            FROM startup_connection_participants p
            WHERE p.event_id = e.id
          )

          WHERE e.id = ?
        `,
        [eventId],
      );
    }

    await connection.commit();

    return {
      file: data.fileName,
      sheetName: data.sheetName,

      importType: data.importType,

      eventId,
      eventName,

      createdEvent,

      totalParticipants: participants.length,
      totalStudents: participants.length,

      createdUsers,
      existedUsers,

      createdRegistrations,
      existedRegistrations,
    };
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}
// =====================================
// Import 1 file Excel
// =====================================

async function importSingleFile(data, options = {}) {
  if (
    ["STARTUP_EXHIBITION", "STARTUP_SEMINAR", "NETWORKING_EVENT"].includes(
      data?.importType,
    )
  ) {
    return importEventItem(data);
  }

  // Không tự import sheet chưa nhận diện
  if (data?.importType === "UNKNOWN") {
    throw createImportError(
      "Sheet chưa xác định được loại dữ liệu nên không thể import tự động.",
      "IMPORT_TYPE_UNKNOWN",
      {
        fileName: data.fileName,
        sheetName: data.sheetName,
      },
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
  ============================
  1. PROGRAM
  ============================
*/

    const program = await ImportModel.findProgramByName(
      connection,
      data.class.programName,
    );
    if (!program) {
      await connection.rollback();

      return {
        needConfirm: true,

        file: data.fileName,

        type: "TRAINING_COURSE_NOT_FOUND",

        reason: "TRAINING_COURSE_NOT_FOUND",

        trainingCourseId: null,

        trainingCourseName: data.class?.programName || null,

        trainingClassName: normalizeCourseName(data.class?.className),

        // alias cũ tạm giữ
        programId: null,

        programName: data.class?.programName || null,

        courseName: normalizeCourseName(data.class?.className),

        message:
          "Không tìm thấy khóa đào tạo tương ứng với dữ liệu trong file Excel.",
      };
    }

    const programId = program.id;

    /*
============================
2. COURSE
============================
*/

    const courseName = normalizeCourseName(data.class.className);

    let course = await ImportModel.findCourseByName(
      connection,
      courseName,
      programId,
    );

    let courseId;
    let createdCourse = false;

    if (course) {
      courseId = course.id;
    } else {
      /*
       * Chưa được Admin xác nhận tạo khóa:
       * trả dữ liệu về Frontend để mở modal xác nhận.
       */
      if (!options.allowCreateCourse) {
        await connection.rollback();

        return {
          needConfirm: true,

          file: data.fileName,

          type: "TRAINING_CLASS_NOT_FOUND",

          reason: "TRAINING_CLASS_NOT_FOUND",

          // ============================
          // TÊN NGHIỆP VỤ MỚI
          // ============================

          trainingCourseId: programId,

          trainingCourseName: program.program_name,

          trainingClassName: courseName,

          // ============================
          // ALIAS CŨ CHO FE
          // ============================

          programId,

          programName: program.program_name,

          courseName,

          message:
            `Chưa tìm thấy lớp học "${courseName}" ` +
            `trong khóa đào tạo "${program.program_name}".`,
        };
      }

      /*
       * Kiểm tra chương trình Admin xác nhận có đúng
       * chương trình Backend nhận diện từ Excel không.
       */
      if (
        options.expectedProgramId &&
        Number(options.expectedProgramId) !== Number(programId)
      ) {
        throw createImportError(
          "Chương trình xác nhận không khớp với chương trình trong file Excel.",
          "PROGRAM_CONFIRMATION_MISMATCH",
          {
            expectedProgramId: Number(options.expectedProgramId),
            detectedProgramId: Number(programId),
          },
        );
      }

      const baseSlug = createSlug(courseName);

      if (!baseSlug) {
        throw createImportError(
          "Không thể tạo slug từ tên khóa học.",
          "COURSE_SLUG_INVALID",
          {
            courseName,
          },
        );
      }

      /*
       * Có thể khóa học đã tồn tại nhưng bước tìm theo tên
       * không bắt được vì tên trong Excel khác cách viết trong DB.
       */
      const existedCourseBySlug = await ImportModel.findCourseBySlug(
        connection,
        baseSlug,
      );

      if (
        existedCourseBySlug &&
        Number(existedCourseBySlug.program_id) === Number(programId)
      ) {
        /*
         * Cùng slug và cùng chương trình:
         * sử dụng khóa cũ.
         */
        courseId = existedCourseBySlug.id;
        course = existedCourseBySlug;
      } else {
        /*
         * Slug đang thuộc chương trình khác hoặc chưa tồn tại:
         * tìm slug duy nhất để tạo khóa mới.
         */
        const uniqueSlug = await createUniqueCourseSlug(
          connection,
          baseSlug,
          programId,
        );

        try {
          courseId = await ImportModel.createCourse(connection, {
            program_id: programId,
            course_name: courseName,
            slug: uniqueSlug,
            status: "OPEN",
          });

          createdCourse = true;
        } catch (error) {
          if (error.code !== "ER_DUP_ENTRY") {
            throw error;
          }

          /*
           * Phòng trường hợp hai request cùng tạo khóa một lúc.
           */
          const existedAfterDuplicate = await ImportModel.findCourseBySlug(
            connection,
            uniqueSlug,
          );

          if (
            !existedAfterDuplicate ||
            Number(existedAfterDuplicate.program_id) !== Number(programId)
          ) {
            throw error;
          }

          courseId = existedAfterDuplicate.id;
          course = existedAfterDuplicate;
        }
      }
    }
    /*
       
        
    /*
  ============================
  ĐỢT TỔ CHỨC
  course_classes
  ============================
*/

    let openingData = await ImportModel.findClass(
      connection,

      // Lớp học cha
      courseId,

      // Thông tin đợt tổ chức
      data.class.className,
      data.class.location,
      data.class.schedule,
    );

    let openingId;

    if (openingData) {
      openingId = openingData.id;
    } else {
      openingId = await ImportModel.createClass(connection, {
        // courseId hiện tại chính là ID Lớp học
        course_id: courseId,

        class_name: data.class.className,

        location: data.class.location,

        schedule: data.class.schedule,
      });
    }

    /*
            ============================
            4. STUDENTS
            ============================
        */

    let createdUsers = 0;

    let existedUsers = 0;

    let createdRegistrations = 0;

    let existedRegistrations = 0;
    const students = Array.isArray(data.students) ? data.students : [];

    if (students.length === 0) {
      throw createImportError(
        "Sheet không còn học viên hợp lệ để import.",
        "EMPTY_STUDENT_LIST",
        {
          fileName: data.fileName,
          sheetName: data.sheetName,
        },
      );
    }
    for (let studentIndex = 0; studentIndex < students.length; studentIndex++) {
      const student = students[studentIndex];

      const fullname = cleanValue(student.fullname);

      const email = normalizeEmail(student.email);

      const phone = normalizePhone(student.phone);

      const company = cleanValue(student.organization);
      /*
       * Không cho dữ liệu thiếu họ tên đi xuống database.
       */
      if (!fullname) {
        throw createImportError(
          `Dòng học viên ${studentIndex + 1} chưa có họ và tên.`,
          "STUDENT_NAME_REQUIRED",
          {
            studentIndex,
            sheetName: data.sheetName,
            student,
          },
        );
      }

      /*
       * Không có cả email và số điện thoại thì không thể
       * xác định học viên cũ hay tạo học viên mới.
       */
      if (!email && !phone) {
        throw createImportError(
          `Học viên "${fullname}" chưa có số điện thoại hoặc email. Vui lòng sửa hoặc bỏ dòng này trước khi import.`,
          "STUDENT_CONTACT_REQUIRED",
          {
            studentIndex,
            sheetName: data.sheetName,
            fullname,
            student,
          },
        );
      }

      /*
       * Tìm riêng theo email và số điện thoại.
       * Không dừng kiểm tra chỉ vì đã tìm thấy email.
       */
      const userByEmail = email
        ? await ImportModel.findUserByEmail(connection, email)
        : null;

      const userByPhone = phone
        ? await ImportModel.findUserByPhone(connection, phone)
        : null;

      /*
       * Trường hợp nguy hiểm:
       * Email thuộc một hồ sơ nhưng SĐT lại thuộc hồ sơ khác.
       *
       * Ví dụ:
       * userByEmail.id = 10
       * userByPhone.id = 25
       *
       * Không được tự chọn một trong hai.
       * Phải dừng dòng này để Admin sửa hoặc bỏ dòng.
       */
      if (
        userByEmail &&
        userByPhone &&
        Number(userByEmail.id) !== Number(userByPhone.id)
      ) {
        throw createImportError(
          `Học viên "${fullname}" có email và số điện thoại đang thuộc hai hồ sơ khác nhau. Vui lòng kiểm tra và sửa lại dữ liệu.`,
          "STUDENT_IDENTITY_CONFLICT",
          {
            studentIndex: studentIndex + 1,
            sheetName: data.sheetName,

            fullname,
            email,
            phone,

            // Hồ sơ tìm thấy theo Email
            emailUserId: userByEmail.id,
            emailUserName: userByEmail.fullname,
            emailUserEmail: userByEmail.email,
            emailUserPhone: userByEmail.phone,

            // Hồ sơ tìm thấy theo SĐT
            phoneUserId: userByPhone.id,
            phoneUserName: userByPhone.fullname,
            phoneUserEmail: userByPhone.email,
            phoneUserPhone: userByPhone.phone,
          },
        );
      }
      // =====================================================
      // CASE:
      // SĐT đã thuộc một học viên,
      // nhưng email trong Excel lại khác email đang lưu.
      //
      // Không được tự động gộp vì có khả năng:
      // - Excel nhập sai SĐT
      // - Excel nhập sai email
      // - Hai người đang dùng chung một SĐT
      // =====================================================
      if (
        !userByEmail &&
        userByPhone &&
        email &&
        userByPhone.email &&
        String(userByPhone.email).trim().toLowerCase() !== email
      ) {
        throw createImportError(
          "Số điện thoại đã thuộc một học viên khác nhưng email không khớp.",

          "STUDENT_PHONE_CONFLICT",

          {
            sheetName: data.sheetName,
            studentIndex: studentIndex + 1,

            fullname,
            email,
            phone,

            phoneUserId: userByPhone.id,
            phoneUserName: userByPhone.fullname,
            phoneUserEmail: userByPhone.email,
          },

          422,
        );
      }
      // =====================================================
      // EMAIL + PHONE đều khớp một user,
      // nhưng HỌ TÊN khác.
      //
      // Đây có thể là dữ liệu Excel nhập nhầm.
      // Chặn để Admin kiểm tra thay vì tự động gộp.
      // =====================================================
      if (
        userByEmail &&
        userByPhone &&
        Number(userByEmail.id) === Number(userByPhone.id) &&
        fullname &&
        userByEmail.fullname &&
        normalizeText(userByEmail.fullname) !== normalizeText(fullname)
      ) {
        throw createImportError(
          "Email và số điện thoại đã tồn tại nhưng họ tên học viên không khớp.",

          "STUDENT_NAME_CONFLICT",

          {
            sheetName: data.sheetName,
            studentIndex: studentIndex + 1,

            fullname,
            email,
            phone,

            existingUserId: userByEmail.id,
            existingFullname: userByEmail.fullname,
            existingEmail: userByEmail.email,
            existingPhone: userByEmail.phone,
          },

          422,
        );
      }

      /*
       * Nếu email và phone cùng tìm về một người,
       * hoặc chỉ một trong hai tìm thấy,
       * thì dùng hồ sơ đó.
       */
      let user = null;

      if (userByEmail) {
        user = userByEmail;
      } else if (userByPhone) {
        user = userByPhone;
      }

      let userId;

      if (user) {
        userId = user.id;
        existedUsers++;
      } else {
        /*
         * Database hiện bắt buộc users.phone NOT NULL.
         * Nếu đây là học viên mới nhưng không có SĐT thì không được INSERT.
         */
        if (!phone) {
          throw createImportError(
            `Học viên mới "${fullname}" chưa có số điện thoại. Vui lòng bổ sung số điện thoại hoặc bỏ dòng này.`,
            "STUDENT_PHONE_REQUIRED",
            {
              studentIndex,
              sheetName: data.sheetName,
              fullname,
              email,
              student,
            },
          );
        }

        userId = await ImportModel.createUser(connection, {
          fullname,
          email,
          phone,
          company,
        });

        createdUsers++;
      }

      const registered = await ImportModel.checkRegistration(
        connection,
        userId,
        openingId,
      );

      if (registered) {
        existedRegistrations++;
      } else {
        await ImportModel.createRegistration(connection, {
          user_id: userId,

          // registrations.class_id vẫn FK tới course_classes.id
          class_id: openingId,
        });

        createdRegistrations++;
      }
    }
    await ImportModel.updateCurrentStudents(connection, openingId);

    await connection.commit();

    // ============================
    // XÓA FILE EXCEL SAU IMPORT
    // ============================

    // if (data.filePath) {
    //   fs.unlink(data.filePath, (err) => {
    //     if (err) {
    //       console.log("Không thể xóa file:", err.message);
    //     } else {
    //       console.log("Đã xóa file:", data.filePath);
    //     }
    //   });
    // }

    return {
      file: data.fileName,

      // ============================
      // TÊN NGHIỆP VỤ MỚI
      // ============================

      trainingCourseId: programId,

      trainingClassId: courseId,

      openingId,

      // ============================
      // TẠM GIỮ ALIAS CŨ
      // để FE cũ chưa bị lỗi
      // ============================

      programId,

      courseId,

      classId: openingId,

      totalStudents: data.totalStudents,

      createdUsers,

      existedUsers,

      createdRegistrations,

      existedRegistrations,
    };
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

// =====================================
// Import nhiều file
// =====================================

async function importSihubExcel(files) {
  const results = [];

  for (const file of files) {
    const result = await importSingleFile(file);

    results.push(result);

    if (result.needConfirm) {
      break;
    }
  }

  return results;
}
// =====================================
// Admin xác nhận tạo khóa và tiếp tục import
// =====================================
async function createCourseAndContinueImport({ fileData, programId }) {
  if (!fileData) {
    throw new Error("Không có dữ liệu file đang chờ import.");
  }

  if (!programId) {
    throw new Error("Thiếu chương trình đào tạo.");
  }

  return importSingleFile(fileData, {
    allowCreateCourse: true,
    expectedProgramId: Number(programId),
  });
}
module.exports = {
  importSihubExcel,
  createCourseAndContinueImport,
};
