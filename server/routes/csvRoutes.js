const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware.js');
const { uploadExcelCSV, handleMulterError } = require('../middleware/csvUpload.js');
const aiAnalysisController = require('../controller/aiAnalysisController.js');

const router = express.Router();

// All routes are protected and mentor-only
router.use(protect);
router.use(restrictTo('mentor'));

// Upload XLSX/CSV, send to AI API, store in DB
router.post('/upload-analyze-ai', 
  uploadExcelCSV.single('excelFile'), // Now this will work
  handleMulterError, // Add error handling
  aiAnalysisController.uploadAndAnalyzeWithExternalAI
);

// Get all my analysis results
router.get('/my-results', aiAnalysisController.getMyAnalysisResults);

// Get specific analysis result by ID
router.get('/result/:id', aiAnalysisController.getAnalysisResultById);

// Delete analysis result
router.delete('/result/:id', aiAnalysisController.deleteAnalysisResult);

// Check AI API status
router.get('/ai-status', aiAnalysisController.checkAIApiStatus);

module.exports = router;
