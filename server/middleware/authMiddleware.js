const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');
const Admin = require('../models/adminModel.js');
const { verifyToken } = require('../utils/jwt.js');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[21];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user based on role
    let currentUser;
    if (decoded.role === 'student') {
      currentUser = await User.findById(decoded.id).populate('mentor', 'name email uniqueId');
    } else if (decoded.role === 'mentor') {
      currentUser = await Admin.findById(decoded.id).populate('students', 'name rollNumber studentId');
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    // Grant access
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Restrict to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
