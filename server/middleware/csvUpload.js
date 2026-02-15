const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp and user ID
    const uniqueName = `${Date.now()}-${req.user.id}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// File filter to allow Excel and CSV files
const excelCsvFilter = (req, file, cb) => {
  console.log('File being uploaded:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Allowed MIME types
  const allowedMimeTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream' // Sometimes Excel files come as this
  ];
  
  // Allowed file extensions
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  // Check both MIME type and file extension
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    console.log('File accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, 'Type:', file.mimetype);
    cb(new Error(`Please upload only Excel (.xlsx, .xls) or CSV (.csv) files. Received: ${file.mimetype}`), false);
  }
};

// Configure multer with options
const uploadExcelCSV = multer({
  storage: storage,
  fileFilter: excelCsvFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 1 // Only allow 1 file at a time
  }
});

// Error handler middleware for multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum allowed size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Please upload only one file at a time.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use the correct field name.'
      });
    }
  }
  
  // Handle custom file filter errors
  if (error.message.includes('Please upload only')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  // Pass other errors to global error handler
  next(error);
};

// Export both the multer instance and error handler
module.exports = {
  uploadExcelCSV,
  handleMulterError
};
