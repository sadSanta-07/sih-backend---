const XLSX = require('xlsx');
const fs = require('fs');
const csv = require('csv-parser');

class FileProcessingService {
  
  // Process CSV file - read directly without conversion
  async processCsvFile(filePath) {
    try {
      return new Promise((resolve, reject) => {
        const results = [];
        const headers = [];
        let isFirstRow = true;
        
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => {
            if (isFirstRow) {
              headers.push(...Object.keys(data));
              isFirstRow = false;
            }
            results.push(data);
          })
          .on('end', () => {
            // Read original CSV content as string for AI API
            const csvString = fs.readFileSync(filePath, 'utf8');
            
            resolve({
              success: true,
              csvString: csvString,
              metadata: {
                headers: headers,
                rowCount: results.length,
                columnCount: headers.length,
                sampleData: results.slice(0, 5), // First 5 rows as sample
                fileType: 'csv'
              }
            });
          })
          .on('error', (error) => {
            reject(new Error(`CSV processing failed: ${error.message}`));
          });
      });
    } catch (error) {
      throw new Error(`CSV file processing error: ${error.message}`);
    }
  }
  
  // Process Excel file - convert to CSV
  processExcelFile(filePath) {
    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);
      
      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to CSV string
      const csvString = XLSX.utils.sheet_to_csv(worksheet);
      
      // Also get JSON for metadata
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Filter empty rows
      const filteredData = jsonData.filter(row => 
        row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );
      
      if (filteredData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
      }
      
      const headers = filteredData[0];
      const dataRows = filteredData.slice(1);
      
      // Convert to object format for sample data
      const sampleData = dataRows.slice(0, 5).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || null;
        });
        return obj;
      });
      
      return {
        success: true,
        csvString: csvString,
        metadata: {
          headers: headers,
          rowCount: dataRows.length,
          columnCount: headers.length,
          sampleData: sampleData,
          fileType: 'excel'
        }
      };
      
    } catch (error) {
      throw new Error(`Excel to CSV conversion failed: ${error.message}`);
    }
  }
  
  // Universal file processor - detects type and processes accordingly
  async processFile(filePath, originalName) {
    const fileExtension = originalName.toLowerCase().split('.').pop();
    
    console.log(`Processing ${fileExtension.toUpperCase()} file: ${originalName}`);
    
    if (fileExtension === 'csv') {
      console.log('CSV detected - Processing directly without conversion');
      return await this.processCsvFile(filePath);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      console.log('Excel detected - Converting to CSV first');
      return this.processExcelFile(filePath);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }
  
  // Clean up file
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('File cleanup error:', error);
    }
  }
}

module.exports = new FileProcessingService();
