const fileProcessingService = require('../services/excelToJsonService.js');
const externalAIService = require('../services/externalAIService.js');
const AnalysisResult = require('../models/analysisResultModel.js');
const path = require('path');

class AIAnalysisController {
  
  // Upload file (CSV/Excel), process accordingly, send to AI API, store result in DB
  async uploadAndAnalyzeWithExternalAI(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const filePath = req.file.path;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;
      const fileExtension = path.extname(fileName).toLowerCase();

      // Validate file type
      if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
        await fileProcessingService.cleanupFile(filePath);
        return res.status(400).json({
          success: false,
          message: 'Please upload only Excel (.xlsx, .xls) or CSV (.csv) files'
        });
      }

      console.log(`Processing file: ${fileName} (${fileExtension})`);

      // Step 1: Process file based on type (CSV direct, Excel converted)
      const processingResult = await fileProcessingService.processFile(filePath, fileName);

      if (!processingResult.success) {
        await fileProcessingService.cleanupFile(filePath);
        return res.status(400).json({
          success: false,
          message: 'Failed to process uploaded file'
        });
      }

      // Log processing result
      if (processingResult.metadata.fileType === 'csv') {
        console.log(`CSV processed directly. Rows: ${processingResult.metadata.rowCount}`);
      } else {
        console.log(`Excel converted to CSV. Rows: ${processingResult.metadata.rowCount}`);
      }

      // Step 2: Send CSV data to external AI API
      const aiResponse = await externalAIService.sendToAIModel(
        processingResult.csvString,
        fileName,
        {
          rowCount: processingResult.metadata.rowCount,
          columns: processingResult.metadata.headers,
          originalFileType: processingResult.metadata.fileType
        }
      );

      console.log('Received response from AI API');

      // Step 3: Store result in MongoDB
      const analysisResult = new AnalysisResult({
        fileName: fileName,
        fileSize: fileSize,
        uploadedBy: req.user._id,
        originalData: {
          rowCount: processingResult.metadata.rowCount,
          columnCount: processingResult.metadata.columnCount,
          columns: processingResult.metadata.headers,
          sampleData: processingResult.metadata.sampleData
        },
        aiApiResponse: aiResponse.data,
        analysisMetadata: {
          apiEndpoint: aiResponse.apiEndpoint,
          processingTime: aiResponse.processingTime,
          status: 'completed',
          originalFileType: processingResult.metadata.fileType,
          conversionRequired: processingResult.metadata.fileType === 'excel'
        }
      });

      const savedResult = await analysisResult.save();

      console.log(`Analysis result saved to database with ID: ${savedResult._id}`);

      // Step 4: Clean up uploaded file
      await fileProcessingService.cleanupFile(filePath);

      // Step 5: Return response to frontend
      res.status(200).json({
        success: true,
        message: `${processingResult.metadata.fileType.toUpperCase()} file analyzed successfully and result saved to database`,
        data: {
          analysisId: savedResult._id,
          fileName: fileName,
          fileSize: fileSize,
          fileType: processingResult.metadata.fileType,
          conversionRequired: processingResult.metadata.fileType === 'excel',
          rowCount: processingResult.metadata.rowCount,
          columnCount: processingResult.metadata.columnCount,
          processingTime: aiResponse.processingTime,
          aiResult: aiResponse.data, // AI analysis result
          uploadedAt: savedResult.createdAt,
          uploadedBy: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
          }
        }
      });

    } catch (error) {
      // Clean up file on error
      if (req.file?.path) {
        await fileProcessingService.cleanupFile(req.file.path);
      }

      console.error('❌ AI Analysis Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze file with AI',
        error: error.message
      });
    }
  }

  // Get all analysis results for logged-in mentor
  async getMyAnalysisResults(req, res) {
    try {
      const results = await AnalysisResult
        .find({ uploadedBy: req.user._id })
        .select('-aiApiResponse') // Exclude full AI response for list view
        .sort({ createdAt: -1 }) // Latest first
        .limit(50); // Limit to 50 results

      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });

    } catch (error) {
      console.error('Get Results Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analysis results',
        error: error.message
      });
    }
  }

  // Get specific analysis result with full AI response
  async getAnalysisResultById(req, res) {
    try {
      const { id } = req.params;

      const result = await AnalysisResult
        .findOne({ 
          _id: id, 
          uploadedBy: req.user._id 
        })
        .populate('uploadedBy', 'name email');

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Analysis result not found'
        });
      }

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Get Result Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve analysis result',
        error: error.message
      });
    }
  }

  // Delete analysis result
  async deleteAnalysisResult(req, res) {
    try {
      const { id } = req.params;

      const result = await AnalysisResult.findOneAndDelete({ 
        _id: id, 
        uploadedBy: req.user._id 
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Analysis result not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Analysis result deleted successfully'
      });

    } catch (error) {
      console.error('Delete Result Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete analysis result',
        error: error.message
      });
    }
  }

  // Check AI API health
  async checkAIApiStatus(req, res) {
    try {
      const healthStatus = await externalAIService.checkAIApiHealth();

      res.status(200).json({
        success: true,
        aiApiStatus: healthStatus
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to check AI API status',
        error: error.message
      });
    }
  }
}

module.exports = new AIAnalysisController();
