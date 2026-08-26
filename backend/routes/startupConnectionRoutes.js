const express = require("express");

const router = express.Router();

const AuthMiddleware = require("../middleware/authMiddleware");

const RoleMiddleware = require("../middleware/roleMiddleware");

const ScopeMiddleware = require("../middleware/scopeMiddleware");

const {
  getEvents,
  getEventById,
  getStatistics,
  createEvent,
  updateEvent,
  deleteEvent,
  getParticipants,

  addParticipant,
  deleteParticipant,
  registerPublic,
  exportEvents,

  // MỚI
  migrateNetworkingToSeminar,
} = require("../controllers/startupConnectionController");

const verifyToken = AuthMiddleware.verifyToken;

const allowAdmin = RoleMiddleware.allow("SUPER_ADMIN", "ADMIN");

const allowEvent = ScopeMiddleware.allow("EVENT");

// ==========================================
// PUBLIC
// ==========================================

router.get("/events", getEvents);

router.post("/events/:id/register", registerPublic);
// ==========================================
// CHUYỂN NETWORKING EVENT -> SEMINAR
// ==========================================

router.post(
  "/events/migrate-networking/:networkingEventId",
  verifyToken,
  allowAdmin,
  allowEvent,
  migrateNetworkingToSeminar,
);
router.get(
  "/events/statistics",
  verifyToken,
  allowAdmin,
  allowEvent,
  getStatistics,
);
// ==========================================
// ADMIN EVENT
// IMPORTANT: export trước /:id
// ==========================================

router.get("/events/export", verifyToken, allowAdmin, allowEvent, exportEvents);

router.get(
  "/events/:id/participants",
  verifyToken,
  allowAdmin,
  allowEvent,
  getParticipants,
);

router.post(
  "/events/:id/participants",
  verifyToken,
  allowAdmin,
  allowEvent,
  addParticipant,
);

router.delete(
  "/events/:id/participants/:participantId",
  verifyToken,
  allowAdmin,
  allowEvent,
  deleteParticipant,
);

// ==========================================
// PUBLIC DETAIL
// ==========================================

router.get("/events/:id", getEventById);

// ==========================================
// ADMIN CRUD
// ==========================================

router.post("/events", verifyToken, allowAdmin, allowEvent, createEvent);

router.put("/events/:id", verifyToken, allowAdmin, allowEvent, updateEvent);

router.delete("/events/:id", verifyToken, allowAdmin, allowEvent, deleteEvent);

module.exports = router;
