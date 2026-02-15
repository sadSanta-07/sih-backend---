const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes.js');
const csvRoutes = require('./routes/csvRoutes.js'); 

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/csv', csvRoutes); // Add this line

// Health check
app.get('/api/health', (req, res) => {
  const port = process.env.PORT || 5000;
  res.status(200).json({
    success: true,
    message: 'SIH Auth Server is running!',
    routes: [
      `POST    http://localhost:${port}/api/auth/register/student`,
      `POST    http://localhost:${port}/api/auth/register/mentor`,
      `POST    http://localhost:${port}/api/auth/login`,
      `GET     http://localhost:${port}/api/auth/profile`,
      `GET     http://localhost:${port}/api/auth/mentor-dashboard`,
      `POST    http://localhost:${port}/api/csv/upload-analyze-ai`,
      `GET     http://localhost:${port}/api/csv/my-results`,
      `GET     http://localhost:${port}/api/csv/result/:id`,
      `DELETE  http://localhost:${port}/api/csv/result/:id`,
      `GET     http://localhost:${port}/api/csv/ai-status`
    ],
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('/*notfound', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🔗 SIH Auth Server running on http://localhost:${PORT}\n`);
  
  console.log("Available Auth Routes:");
  console.log(`POST   http://localhost:${PORT}/api/auth/register/student   (Student Registration)`);
  console.log(`POST   http://localhost:${PORT}/api/auth/register/mentor    (Mentor Registration)`);
  console.log(`POST   http://localhost:${PORT}/api/auth/login              (Login)`);
  console.log(`GET    http://localhost:${PORT}/api/auth/profile            (Get profile)`);
  console.log(`GET    http://localhost:${PORT}/api/auth/mentor-dashboard   (Mentor dashboard)\n`);
  
  console.log("Available AI Analysis Routes (Mentor Only):");
  console.log(`POST   http://localhost:${PORT}/api/csv/upload-analyze-ai   (Upload Excel → AI Analysis → Save to DB)`);
  console.log(`GET    http://localhost:${PORT}/api/csv/my-results          (Get my analysis results)`);
  console.log(`GET    http://localhost:${PORT}/api/csv/result/:id          (Get specific result by ID)`);
  console.log(`DELETE http://localhost:${PORT}/api/csv/result/:id          (Delete analysis result)`);
  console.log(`GET    http://localhost:${PORT}/api/csv/ai-status           (Check AI API status)\n`);
  
  console.log(`Health Check:`);
  console.log(`GET    http://localhost:${PORT}/api/health                  (Server health check)\n`);
});

module.exports = app;
