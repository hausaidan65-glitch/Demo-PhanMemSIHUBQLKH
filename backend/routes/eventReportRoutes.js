const express = require("express");

const router = express.Router();

const EventReportController = require("../controllers/eventReportController");
const AuthMiddleware = require("../middleware/authMiddleware");
const RoleMiddleware = require("../middleware/roleMiddleware");
const ScopeMiddleware = require("../middleware/scopeMiddleware");

router.use(
  AuthMiddleware.verifyToken,
  RoleMiddleware.allow("SUPER_ADMIN", "ADMIN"),
  ScopeMiddleware.allow("EVENT"),
);

router.get("/seminars/summary", EventReportController.seminarSummary);
router.get("/seminars", EventReportController.seminars);
router.get(
  "/seminars/:seminarId/participants",
  EventReportController.seminarParticipants,
);
router.get(
  "/seminars/:seminarId/participants/export",
  EventReportController.exportSeminarParticipants,
);
router.get(
  "/seminars/:seminarId/participants/:participantId",
  EventReportController.seminarParticipantDetail,
);

module.exports = router;
