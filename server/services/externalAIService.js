const axios = require('axios');
const FormData = require('form-data');

class ExternalAIService {
  
  constructor() {
    // You'll provide these API details
    this.aiApiBaseUrl = process.env.AI_API_BASE_URL || 'http://your-ai-api-endpoint.com';
    this.aiApiKey = process.env.AI_API_KEY || 'your-api-key';
    this.timeout = 60000; // 60 seconds timeout
  }

  // Send CSV data to external AI API
  async sendToAIModel(csvData, fileName, additionalParams = {}) {
    try {
      const startTime = Date.now();

      // Prepare the request payload
      const payload = {
        csvData: csvData,
        fileName: fileName,
        timestamp: new Date().toISOString(),
        ...additionalParams
      };

      // Configure request headers
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiApiKey}`,
          'Accept': 'application/json'
        },
        timeout: this.timeout
      };

      console.log(`Sending data to AI API: ${this.aiApiBaseUrl}/analyze`);

      // Make API call to your external AI service
      const response = await axios.post(
        `${this.aiApiBaseUrl}/analyze`,
        payload,
        config
      );

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        processingTime: processingTime,
        status: response.status,
        apiEndpoint: `${this.aiApiBaseUrl}/analyze`
      };

    } catch (error) {
      console.error('AI API Error:', error.message);
      
      // Handle different types of errors
      if (error.response) {
        // API returned error response
        throw new Error(`AI API Error (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('AI API is not responding. Please try again later.');
      } else {
        // Something else happened
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  // Alternative method if AI API expects form data with CSV file
  async sendCSVFileToAI(csvContent, fileName, additionalParams = {}) {
    try {
      const form = new FormData();
      
      // Create CSV buffer
      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      form.append('file', csvBuffer, {
        filename: fileName.replace('.xlsx', '.csv'),
        contentType: 'text/csv'
      });

      // Add additional parameters
      Object.keys(additionalParams).forEach(key => {
        form.append(key, additionalParams[key]);
      });

      const config = {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${this.aiApiKey}`
        },
        timeout: this.timeout
      };

      const response = await axios.post(
        `${this.aiApiBaseUrl}/upload-analyze`,
        form,
        config
      );

      return {
        success: true,
        data: response.data,
        status: response.status,
        apiEndpoint: `${this.aiApiBaseUrl}/upload-analyze`
      };

    } catch (error) {
      throw new Error(`AI API File Upload Error: ${error.message}`);
    }
  }

  // Health check for AI API
  async checkAIApiHealth() {
    try {
      const response = await axios.get(`${this.aiApiBaseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.aiApiKey}`
        },
        timeout: 10000
      });

      return {
        status: 'healthy',
        response: response.data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new ExternalAIService();
