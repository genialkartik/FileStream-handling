import React, { useEffect, useState } from 'react';
import io from 'socket.io-client'

function App() {
  // const ENDPOINT = 'http://localhost:2020/'
  const [SelectedFile, setSelectedFile] = useState('')
  const [isFile, setisFile] = useState(false)
  const [uploading, setUploading] = useState(false)
  // const [pause, setPause] = useState(false)

  var fRead; var fname;

  let socket;
  socket = io.connect(ENDPOINT)
  useEffect(() => {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  }, [ENDPOINT, SelectedFile]);

  const StartUpload = () => {
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
    var BufPos = data.BufPos * 500000
    var NewFile;
    NewFile = SelectedFile.slice(BufPos, BufPos + Math.min(500000, (SelectedFile.size - BufPos)));
    fRead.readAsBinaryString(NewFile);
  })

  const UpdateBar = (percent) => {
    document.querySelector('#percent').innerHTML = (Math.round(percent * 100) / 100) + '%';
    var MBDone = Math.round(((percent / 100.0) * SelectedFile.size) / 1000000); // 1MB
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
      <h1>File Streaming Control</h1>
      <div id="UploadCont">
        <span id='UploadArea'>
          {(uploading) ?
            <div>
              <h3 id='NameCont'>Uploading {SelectedFile.name}</h3><br /><br />
              <div id="ProgressContainer"></div><b id="percent"></b><br />
              <span id='Uploaded'><span id='MB'></span> / {SelectedFile.size / 100000} MB</span><br /><br />
              <button type='button' onClick={pauseUpload} id='PauseButton' className='PauseButton'>Pause</button>
            </div> :
            <div>
              {(isFile) ?
                <div>
                  <h3 id='NameCont'>Uploading {SelectedFile.name}</h3><br /><br />
                  <button type='button' onClick={StartUpload} id='UploadButton' className='Button'>Resume</button><br /><br />
                  <button type='button' onClick={TerminateUpload} id='TerminateButton' className='Button'>Terminate</button>
                </div> :
                <div>
                  <label htmlFor="FileCont">Choose A File: </label>
                  <input type="file" id="FileCont" onChange={(e) => (setSelectedFile(e.target.files[0]))} /><br /><br />
                  <button type='button' onClick={StartUpload} id='UploadButton' className='Button'>Upload</button>
                </div>
              }
            </div>
          }
        </span>
      </div>
    </div>
  );
}
export default App;
