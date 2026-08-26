const express = require("express");

const router = express.Router();

const ExhibitionSurveyController = require("../controllers/exhibitionSurveyController");
router.get("/export", ExhibitionSurveyController.exportExcel);
router.post("/events/:id", ExhibitionSurveyController.submitSurvey);

module.exports = router;
