import React, { Component } from 'react';
import * as d3 from 'd3';

class FileUpload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      parsedData: null,  // Store the parsed CSV data
    };
  }
  
  handleFileSubmit = (event) => {
    event.preventDefault();
    const { selectedFile } = this.state;
    
    if (selectedFile) {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const csvText = e.target.result;
        const parsedJsonData = this.csvToJson(csvText);
        this.setState({ parsedData: parsedJsonData });  // Set parsed data to state
        this.props.setUploadedData(parsedJsonData)
      };
      fileReader.readAsText(selectedFile);
    }
  };

  csvToJson = (csvContent) => {
    const csvLines = csvContent.split("\n");  // Split by new line to get rows
    const columnHeaders = csvLines[0].split(",").map(h => h.trim()); // Split first row to get headers
    const parsedDataArray = [];
    const dateParser = d3.timeParse("%Y-%m-%d"); // Parse dates in format YYYY-MM-DD

    for (let rowIndex = 1; rowIndex < csvLines.length; rowIndex++) {
      if (!csvLines[rowIndex].trim()) continue; // Skip empty lines
      
      const rowValues = csvLines[rowIndex].split(","); // Split each line by comma
      const rowObject = {};

      // Map each column value to the corresponding header
      columnHeaders.forEach((columnName, columnIndex) => {
        const cellValue = rowValues[columnIndex]?.trim();
        
        // Parse Date column as Date object
        if (columnName === 'Date') {
          rowObject[columnName] = dateParser(cellValue);
        } 
        // Parse numeric columns as numbers
        else if (['GPT-4', 'Gemini', 'PaLM-2', 'Claude', 'LLaMA-3.1'].includes(columnName)) {
          rowObject[columnName] = parseFloat(cellValue); // Convert to number
        } 
        // Keep other values as strings
        else {
          rowObject[columnName] = cellValue;
        }
      });

      // Add object to result if it has valid data
      if (rowObject.Date && !isNaN(rowObject['GPT-4'])) {
        parsedDataArray.push(rowObject);
      }
    }

    console.log("Parsed CSV data:", parsedDataArray);
    return parsedDataArray;
  };

  render() {
    return (
      <div style={{ backgroundColor: "#f0f0f0", padding: 20 }}>
        <h2>Upload a CSV File</h2>
        <form onSubmit={this.handleFileSubmit}>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(event) => this.setState({ selectedFile: event.target.files[0] })} 
          />
          <button type="submit">Upload</button>
        </form>
      </div>
    );
  }
}

export default FileUpload;
