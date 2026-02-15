const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware.js');
const {
  registerStudent,
  registerMentor,
  login,
  getProfile
} = require('../controller/authController.js');

const router = express.Router();

// Public routes
router.post('/register/student', registerStudent);
router.post('/register/mentor', registerMentor);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);

// Student-only routes
router.get('/student-dashboard', protect, restrictTo('student'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to student dashboard!',
    user: req.user
  });
});

// Mentor-only routes
router.get('/mentor-dashboard', protect, restrictTo('mentor'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to mentor dashboard!',
    user: req.user
  });
});

module.exports = router;
