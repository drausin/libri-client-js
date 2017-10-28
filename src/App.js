// @flow

import * as React from 'react';
import './App.css';
import * as author from '../src/libri/author/author';

/**
 * Top-level application container.
 */
export default class App extends React.Component<{}> {
  /**
   * @return {App}
   */
  render() {
    return (
        <div className="App">
          <h1>Libri Web Client</h1>
          <UploadSelector />
        </div>
    );
  }
}

type FileInfo = {
  name: ?string,
};

type FileStatus = {
  status: ?string,
};

type UploadSelectorProps = {
  onChange: Function,
}

type UploadSelectorState = {
  fileInfo: FileInfo,
  fileStatus: FileStatus,
};

class UploadSelector extends React.Component<UploadSelectorProps, UploadSelectorState> {
  handleChange: Function;

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.state = {
      fileInfo: {name: undefined},
      fileStatus: {status: undefined},
    };
  }

  /**
   * @return {UploadSelector}
   */
  render() {
    return (
        <div className="Uploader">
          <p>Uploader</p>
          <input
              id="fileInput"
              type="file"
              onChange={this.handleChange}
          />
          <FileDisplay name={this.state.fileInfo.name} />
          <FileStatusDisplay status={this.state.fileStatus.status}/>
        </div>
    );
  }

  handleChange(event) {
    const file = event.target.files[0];
    this.setState({
      fileInfo: {name: file.name},
      fileStatus: {status: 'uploading...'},
    });
    let reader = new FileReader();
    reader.onload = (event) => {
      const contents = new Uint8Array(event.target.result);
      console.log('this is where libri upload would happen');
    };
    reader.readAsArrayBuffer(file);
  }
}

function FileDisplay(props: FileInfo) {
  if (props.name) {
    return <p>{props.name}</p>;
  }
  return (null);
}

function FileStatusDisplay(props: FileStatus) {
  if (props.status) {
    return <p>{props.status}</p>;
  }
  return (null);
}

// TODO
// - uploaded files as download links
// - load keychain (??)
