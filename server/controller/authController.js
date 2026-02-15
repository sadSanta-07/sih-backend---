const User = require('../models/userModel.js');
const Admin = require('../models/adminModel.js');
const { generateToken } = require('../utils/jwt');

// Student Registration
const registerStudent = async (req, res) => {
  try {
    const { name, rollNumber, email, password } = req.body;

    // Validate required fields
    if (!name || !rollNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, roll number, emailID, and password'
      });
    }

    // Check if user already exists
const existingUser = await User.findOne({ 
  $or: [
    { rollNumber }, 
    { email }
  ] 
});

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Student with this roll number or student ID already exists'
      });
    }

    // Create user
const user = await User.create({
  name,
  rollNumber,
  email,  
  password
});

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Student registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue);
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Mentor Registration
const registerMentor = async (req, res) => {
  try {
    const { name, email, password, uniqueId } = req.body;

    // Validate required fields
    if (!name || !email || !password || !uniqueId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and unique ID'
      });
    }

    // Check if mentor already exists
    const existingMentor = await Admin.findOne({ 
      $or: [
        { email }, 
        { uniqueId }
      ] 
    });

    if (existingMentor) {
      return res.status(400).json({
        success: false,
        message: 'Mentor with this email or unique ID already exists'
      });
    }

    // Create mentor
    const mentor = await Admin.create({
      name,
      email,
      password,
      uniqueId
    });

    // Generate JWT token
    const token = generateToken(mentor._id, mentor.role);

    res.status(201).json({
      success: true,
      message: 'Mentor registration successful!',
      token,
      user: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        uniqueId: mentor.uniqueId,
        role: mentor.role
      }
    });

  } catch (error) {
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue);
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Login for both students and mentors
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Try mentor first
    let user = await Admin.findOne({ email }).select('+password');
    let userRole = 'mentor';

    // If mentor not found, try student
    if (!user) {
      user = await User.findOne({ email }).select('+password');
      userRole = 'student';
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user._id, userRole);

    user.password = undefined; // Remove password from response

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        ...(userRole === 'mentor' ? { uniqueId: user.uniqueId } : {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get current user profile
const getProfile = async (req, res) => {
  try {
    let userResponse;
    
    if (req.user.role === 'student') {
      userResponse = {
        id: req.user._id,
        name: req.user.name,
        rollNumber: req.user.rollNumber,
        email: req.user.email,
        role: req.user.role,
        mentor: req.user.mentor
      };
    } else {
      userResponse = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        uniqueId: req.user.uniqueId,
        role: req.user.role,
        students: req.user.students
      };
    }

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  registerStudent,
  registerMentor,
  login,
  getProfile
};
