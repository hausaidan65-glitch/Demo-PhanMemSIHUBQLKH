const UnifiedImportValidationService = require("./unifiedImportValidationService");
const UnifiedImportValidationLookupService = require("./unifiedImportValidationLookupService");
const UnifiedImportTrainingAdapter = require("./unifiedImportTrainingAdapter");

const COMMITTABLE_STATUS = "VALID";

function sourceKey(source = {}) {
  return `${source.fileIndex}:${source.sheetIndex}`;
}

function buildCommitPlan(validation) {
  const sheets = (validation?.sheets || []).map((sheet) => {
    const sheetReady = sheet.validationReady === true;

    const rows = (sheet.rows || []).map((row) => ({
      ...row,
      commitEligible: sheetReady && row.status === COMMITTABLE_STATUS,
    }));

    const validRows = rows.filter((row) => row.commitEligible);

    return {
      source: sheet.source,
      module: sheet.module,
      target: sheet.target,
      validationReady: sheetReady,
      rows,
      validRows,
      totalRows: rows.length,
      validRowCount: validRows.length,
      blockedRowCount: rows.length - validRows.length,
    };
  });

  return {
    mode: "COMMIT_PLAN",
    canCommit: false,
    sheets,
    summary: {
      sheets: sheets.length,
      rows: sheets.reduce((sum, sheet) => sum + sheet.totalRows, 0),
      validRows: sheets.reduce((sum, sheet) => sum + sheet.validRowCount, 0),
      blockedRows: sheets.reduce(
        (sum, sheet) => sum + sheet.blockedRowCount,
        0,
      ),
    },
  };
}

async function prepareCommit(payload, database) {
  const sheets = payload?.sheets || [];

  /*
   * Không tin validation/status do frontend gửi lên.
   * Luôn lookup + validate lại bằng DB hiện tại.
   */
  const snapshot = await UnifiedImportValidationLookupService.loadSnapshot(
    sheets,
    database,
  );

  const validation = await UnifiedImportValidationService.validateBatch(
    { sheets },
    snapshot,
  );

  return {
    validation,
    plan: buildCommitPlan(validation),
  };
}

async function executePlan(plan, database) {
  if (!database || typeof database.getConnection !== "function") {
    const error = new Error("Database không hỗ trợ getConnection().");
    error.code = "DATABASE_CONNECTION_UNAVAILABLE";
    throw error;
  }

  const results = [];
  console.log("UNIFIED COMMIT PLAN CHECK", {
    sheetCount: (plan?.sheets || []).length,
    sheets: (plan?.sheets || []).map((sheet) => ({
      source: sheet.source,
      module: sheet.module,
      validationReady: sheet.validationReady,
      totalRows: sheet.totalRows,
      validRowCount: sheet.validRowCount,
      blockedRowCount: sheet.blockedRowCount,
    })),
  });
  for (const sheet of plan?.sheets || []) {
    /*
     * Sheet bị validation chặn thì tuyệt đối không mở transaction.
     */
    if (sheet.validationReady !== true) {
      results.push({
        source: sheet.source,
        module: sheet.module,
        executed: false,
        reason: "SHEET_NOT_READY",
      });

      continue;
    }

    /*
     * Sheet hợp lệ nhưng không có row VALID để ghi.
     */
    if (!sheet.validRowCount) {
      results.push({
        source: sheet.source,
        module: sheet.module,
        executed: false,
        reason: "NO_COMMITTABLE_ROWS",
      });

      continue;
    }

    /*
     * Phase hiện tại mới mở writer cho TRAINING.
     * Module khác giữ fail-closed, chưa ghi DB.
     */
    if (sheet.module !== "TRAINING") {
      results.push({
        source: sheet.source,
        module: sheet.module,
        executed: false,
        reason: "MODULE_COMMIT_NOT_IMPLEMENTED",
      });

      continue;
    }

    let connection;

    try {
      /*
       * Một sheet = một transaction độc lập.
       */
      connection = await database.getConnection();

      await connection.beginTransaction();

      const result = await UnifiedImportTrainingAdapter.importSheet(
        connection,
        sheet,
      );

      await connection.commit();

      results.push({
        ...result,
        executed: true,
      });
    } catch (error) {
      console.error("UNIFIED COMMIT SHEET ERROR", {
        source: sheet?.source,
        module: sheet?.module,
        validRowCount: sheet?.validRowCount,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      if (connection) {
        try {
          await connection.rollback();
        } catch {
          // Không che mất lỗi import gốc.
        }
      }

      results.push({
        source: sheet.source,
        module: sheet.module,
        executed: false,
        status: "FAILED",
        reason: error.code || "TRAINING_COMMIT_FAILED",
        message: error.message,
      });
    } finally {
      if (connection && typeof connection.release === "function") {
        connection.release();
      }
    }
  }

  const committedSheets = results.filter(
    (item) => item.executed === true,
  ).length;

  const failedSheets = results.filter(
    (item) => item.executed === false && item.status === "FAILED",
  ).length;

  const skippedSheets = results.length - committedSheets - failedSheets;

  return {
    mode: "COMMIT_RESULT",
    canCommit: false,
    results,
    summary: {
      sheets: results.length,
      committedSheets,
      failedSheets,
      skippedSheets,
    },
  };
}

async function executeCommit(payload, database) {
  /*
   * Revalidate server-side ngay trước commit.
   */
  const prepared = await prepareCommit(payload, database);

  const execution = await executePlan(prepared.plan, database);

  return {
    validation: prepared.validation,
    plan: prepared.plan,
    execution,
  };
}

module.exports = {
  COMMITTABLE_STATUS,
  sourceKey,
  buildCommitPlan,
  prepareCommit,
  executePlan,
  executeCommit,
};
