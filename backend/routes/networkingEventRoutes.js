const express = require("express");

const router = express.Router();

const {
  getEvents,
  getEventById,
  getStatistics,
  createEvent,
  updateEvent,
  deleteEvent,

  getFilterOptions,
  exportEvents,
  registerPublic,
  getParticipants,
  addParticipant,
  deleteParticipant,
} = require("../controllers/networkingEventController");
const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowEvent = ScopeMiddleware.allow("EVENT");
router.get("/", getEvents);

router.get("/filter-options", getFilterOptions);
router.get("/statistics", verifyToken, allowAdmin, allowEvent, getStatistics);

router.get("/export", verifyToken, allowAdmin, allowEvent, exportEvents);

router.get("/:id", getEventById);
router.post("/:id/register", registerPublic);
router.post("/", verifyToken, allowAdmin, allowEvent, createEvent);

router.put("/:id", verifyToken, allowAdmin, allowEvent, updateEvent);

router.delete("/:id", verifyToken, allowAdmin, allowEvent, deleteEvent);

router.get(
  "/:id/participants",
  verifyToken,
  allowAdmin,
  allowEvent,
  getParticipants,
);

router.post(
  "/:id/participants",
  verifyToken,
  allowAdmin,
  allowEvent,
  addParticipant,
);

router.delete(
  "/:id/participants/:participantId",
  verifyToken,
  allowAdmin,
  allowEvent,
  deleteParticipant,
);

module.exports = router;
