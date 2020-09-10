import React, { useEffect, useState } from 'react';
import io from 'socket.io-client'
import axios from 'axios'

function App() {
  const ENDPOINT = 'http://0.0.0.0:2020/'
  const [SelectedFile, setSelectedFile] = useState('')
  const [isFile, setisFile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])

  var fRead; var fname;

  let socket;
  socket = io.connect(ENDPOINT)
  useEffect(() => {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
    axios.get('/files')
      .then(res => {
        setFiles(res.data)
      })
  }, [ENDPOINT, SelectedFile]);

  const StartUploading = () => {
    if (SelectedFile !== '') {
      fRead = new FileReader()
      fname = SelectedFile.name;
      setUploading(true)
      setisFile(true)
      fRead.onload = (e) => {
        socket.emit('UploadData', { 'Name': fname, Data: e.target.result })
      }
      socket.emit('StartUpload', { 'Name': fname, 'Size': SelectedFile.size })
    } else {
      alert('Select a file');
    }
  }

  socket.on('DataFeedback', (data) => {
    UpdateBar(data.Percent)
    var BufPos = data.BufPos * 524288
    var NewFile;
    NewFile = SelectedFile.slice(BufPos, BufPos + Math.min(524288, (SelectedFile.size - BufPos)));
    fRead.readAsBinaryString(NewFile);
  })

  const UpdateBar = (percent) => {
    document.querySelector('#percent').innerHTML = (Math.round(percent * 100) / 100) + '%';
    var MBDone = Math.round(((percent / 100.0) * SelectedFile.size) / 1048576); // 1MB
    document.querySelector('#MB').innerHTML = MBDone;
  }

  const pauseUpload = () => {
    setUploading(false)
  }
  const TerminateUpload = () => {
    socket.emit('TerminateUpload', { 'Name': SelectedFile.name })
    setUploading(false)
    setisFile(false)
  }

  socket.on('Done', (data) => {
    setUploading(false)
    setisFile(false)
    if (data.status === 'terminated')
      alert('Upload terminated!')
    else
      alert('file uploaded Successfully')
    window.location.reload(true);
  })
  return (
    <div className="App">
      <h1 style={{ textAlign: 'center' }}>Controlable File Streaming</h1><br />
      <div id="UploadCont">
        <span id='UploadArea'>
          {(uploading) ?
            <div>
              <h3 id='NameCont'>Uploading {SelectedFile.name}</h3><br /><br />
              <div id="ProgressContainer"></div><b id="percent"></b><br />
              <span id='Uploaded'><span id='MB'></span> / {SelectedFile.size / 1048576} MB</span><br /><br />
              <button type='button' onClick={pauseUpload} id='PauseButton' className='PauseButton'>Pause</button>
            </div> :
            <div>
              {(isFile) ?
                <div>
                  <h3 id='NameCont'>Uploading {SelectedFile.name}</h3><br /><br />
                  <button type='button' onClick={StartUploading} id='UploadButton' className='Button'>Resume</button><br /><br />
                  <button type='button' onClick={TerminateUpload} id='TerminateButton' className='Button'>Terminate</button>
                </div> :
                <div>
                  <label htmlFor="FileCont">Choose A File: </label>
                  <input type="file" id="FileCont" onChange={(e) => (setSelectedFile(e.target.files[0]))} /><br /><br />
                  <button type='button' onClick={StartUploading} id='UploadButton' className='Button'>Upload</button>
                </div>
              }
            </div>
          }
        </span>
      </div>
      {(files) &&
        <div>
          <h2>Uploaded Files list:</h2><br />
          <ul>
            {files.map(function (file, idx) {
              return <li key={idx}>{file}</li>
            })}
          </ul>
        </div>
      }

      <br /><br /><br />
      <hr />
      <h1>About</h1>
      <b>File Stream Handling is a project to control file uploading and downloading which can be pause and resumed at
            any point of time. Effective in handling large Data file streaming.</b><br />
      <a href="https://github.com/genialkartik/FileStream-handling" rel="noopener noreferrer" target="_blank">
        <img src="https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fwww.pngall.com%2Fwp-content%2Fuploads%2F2016%2F04%2FGithub-PNG-Image.png&f=1&nofb=1" alt="" srcset="" width="90" height="90" />
      </a>
      <h2>Major Tech Stacks used:</h2>
      <ul>
        <li>ReactJS</li>
        <li>Socket.io</li>
        <li>NodeJS + ExpressJS</li>
        <li>file-handling (using fs module)</li>
      </ul>

      <h2>Note: </h2>
      <li>This Project is a continuation of an Industrial task by [Altan](https://atlan.com/).</li>
      <li>There now flow of Database throughout the project. Everything is running on Server Locally (for the time being).</li>
      <li>Future updated will include a lot of stuffs like uploading data into Database (MongoDB), use of GridFS to create small buffers of a single large file, NPM package module, etc.</li>
      <br /><br />
      <hr />
      <div class="flowchart">
        <h1>Flow Chart:</h1>
        <div class="mxgraph" style={{ maxWidth: '100%' }}>
          <img src="./FileStreamHandling.png" alt="flowchart" />
        </div>
      </div>
    </div>
  );
}
export default App;
