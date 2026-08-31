const db = require("../config/db");

class SyncCourseClassStatusJob {
  static async run() {
    // =====================================================
    // 1. OPEN / FULL -> CLOSED
    //
    // Có register_close:
    //   đóng khi hết thời gian đăng ký.
    //
    // Không có register_close:
    //   fallback dữ liệu cũ -> đóng khi tới buổi học đầu tiên.
    // =====================================================

    const [closedResult] = await db.query(
      `
      UPDATE course_classes cc

      LEFT JOIN (
        SELECT
          class_id,

          MIN(
            TIMESTAMP(
              session_date,
              COALESCE(
                start_time,
                '00:00:00'
              )
            )
          ) AS first_session_at

        FROM course_class_sessions

        GROUP BY class_id
      ) first_session
        ON first_session.class_id = cc.id

      SET
        cc.status = 'CLOSED',
        cc.updated_at = NOW()

      WHERE
        cc.deleted_at IS NULL

        AND cc.status IN ('OPEN', 'FULL')

        AND (
          (
            cc.register_close IS NOT NULL
            AND cc.register_close <= NOW()
          )

        OR

(
  cc.register_close IS NULL

  AND COALESCE(
  CASE
    WHEN cc.organization_start_date IS NOT NULL
    THEN TIMESTAMP(
      cc.organization_start_date,
      '00:00:00'
    )
    ELSE NULL
  END,

  first_session.first_session_at
) <= NOW()
)
        )
      `,
    );

    // =====================================================
    // 2. CLOSED -> FINISHED
    //
    // Khi đã qua thời gian kết thúc của buổi học cuối cùng.
    // =====================================================

    const [finishedResult] = await db.query(
      `
      UPDATE course_classes cc

    LEFT JOIN (
        SELECT
          class_id,

          MAX(
            TIMESTAMP(
              session_date,
              COALESCE(
                end_time,
                start_time,
                '23:59:59'
              )
            )
          ) AS last_session_at

        FROM course_class_sessions

        GROUP BY class_id
      ) last_session
        ON last_session.class_id = cc.id

      SET
        cc.status = 'FINISHED',
        cc.updated_at = NOW()

      WHERE
        cc.deleted_at IS NULL

        AND cc.status = 'CLOSED'

     AND COALESCE(
  CASE
    WHEN cc.organization_end_date IS NOT NULL
    THEN TIMESTAMP(
      cc.organization_end_date,
      '23:59:59'
    )
    ELSE NULL
  END,

  last_session.last_session_at
) <= NOW()
      `,
    );

    return {
      closed: closedResult.affectedRows || 0,
      finished: finishedResult.affectedRows || 0,
    };
  }
}

module.exports = SyncCourseClassStatusJob;
