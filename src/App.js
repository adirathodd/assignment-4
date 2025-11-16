import React, { Component } from "react";
import "./App.css";
import FileUpload from "./FileUpload";
import InteractiveStreamGraph from "./InteractiveStreamGraph";

/**
 * This is the main application component that manages the overall state and structure
 * of the streamgraph visualization application. It coordinates data flow between
 * the file upload component and the visualization component.
 */
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      csvData: []     // Initialize state with an empty data array. This will hold the parsed CSV data after file upload
    };
  }

  setUploadedData = (parsedCsvData) => { // Callback function to update the application state with uploaded CSV data. This function is passed down to the FileUpload component as a prop
    this.setState({ csvData: parsedCsvData });
  }

  render() {
    return (
      <div>
        {/* FileUpload component handles CSV file selection and parsing */}
        <FileUpload setUploadedData={this.setUploadedData} />
        
        {/* Parent container for the visualization */}
        <div className="parent">
          {/* InteractiveStreamGraph renders the D3 streamgraph visualization. It receives the parsed CSV data as a prop and updates when data changes */}
          <InteractiveStreamGraph csvData={this.state.csvData} />
        </div>
      </div>
    );
  }
}

export default App;
