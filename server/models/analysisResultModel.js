const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    required: [true, 'Uploaded by mentor is required']
  },
  originalData: {
    rowCount: { type: Number, required: true },
    columnCount: { type: Number, required: true },
    columns: [{ type: String }],
    sampleData: [{ type: mongoose.Schema.Types.Mixed }] // Store first few rows for reference
  },
  aiApiResponse: {
    type: mongoose.Schema.Types.Mixed, // Store the complete AI API response
    required: [true, 'AI API response is required']
  },
  analysisMetadata: {
    apiEndpoint: { type: String, required: true },
    processingTime: { type: Number }, // in milliseconds
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'completed'
    }
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields
});

// Index for faster queries
analysisResultSchema.index({ uploadedBy: 1, createdAt: -1 });
analysisResultSchema.index({ 'analysisMetadata.status': 1 });

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
