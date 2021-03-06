var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var socketio = require('socket.io')
var fs = require('fs')
var cors = require('cors')

var app = express();

var port = process.env.PORT || 2020;
var host = '0.0.0.0'
const server = app.listen(port, host, () => {
  console.log(`Listening on: http://${host}:${port}`);
});
io = socketio(server, { origins: '*:*' })
app.use(cors())
app.use(express.static(path.join(__dirname, "../build")));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://0.0.0.0:3000/");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var Files = {};

app.get('/files', (req, res) => {
  fs.readdir('src/Collection', (err, data) => {
    if (err) console.log(err)
    else
      res.json(data)
  })
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


/////// Algorithm /////////

io.on('connect', (socket) => {
  socket.on('StartUpload', function (data) { //data contains the variables that we passed through in the html file
    var Name = data.Name;
    Files.Name = {  //Create a new Entry in The Files Variable
      FileSize: data.Size,
      Data: "",
      Downloaded: 0
    }
    var BufPos = 0;
    try {
      var Stat = fs.statSync(path.join(__dirname, 'Dummy/') + Name);
      if (Stat.isFile()) {
        Files.Name.Downloaded = Stat.size;
        BufPos = Stat.size / 524288; // 0.5MB
      }
    }
    catch (er) { } //It's a New File
    fs.open(path.join(__dirname, 'Dummy/') + Name, "a", 0755, function (err, fd) {
      if (err) {
        console.log('err')
        console.log(err)
      }
      else {
        Files.Name.Handler = fd; //We store the file handler so we can write to it later
        socket.emit('DataFeedback', { 'BufPos': BufPos, Percent: 0 });
      }
    });
  });

  socket.on('UploadData', function (data) {
    var Name = data.Name;
    Files.Name.Downloaded += data.Data.length;
    Files.Name.Data += data.Data
    if (Files.Name.Downloaded == Files.Name.FileSize) //If File is Fully Uploaded
    {
      fs.write(Files.Name.Handler, Files.Name.Data, null, 'Binary', function (err, Writen) {
        var input = fs.createReadStream(path.join(__dirname, 'Dummy/') + Name);
        var output = fs.createWriteStream(path.join(__dirname, 'Collection/') + Name);
        input.pipe(output);

        input.on("end", function () {
          console.log("end");
          fs.unlink(path.join(__dirname, 'Dummy/') + Name, () => { //This Deletes The Temporary File
            console.log("unlink this file:", Name);
            socket.emit('Done', { status: 'uploaded' });
          });
        });
      });
    }
    else if (Files.Name.Data.length > 5242880) { //If the Data of Buffer reaches 5MB
      fs.write(Files.Name.Handler, Files.Name.Data, null, 'Binary', function (err, Writen) {
        Files.Name.Data = ""; //Reset The Buffer
        var BufPos = Files.Name.Downloaded / 524288;
        var Percent = (Files.Name.Downloaded / Files.Name.FileSize) * 100;
        socket.emit('DataFeedback', { 'BufPos': BufPos, 'Percent': Percent });
      });
    }
    else {
      var BufPos = Files.Name.Downloaded / 524288;
      var Percent = (Files.Name.Downloaded / Files.Name.FileSize) * 100;
      socket.emit('DataFeedback', { 'BufPos': BufPos, 'Percent': Percent });
    }
  });

  socket.on('TerminateUpload', (data) => {
    var Name = data.Name
    fs.unlink(path.join(__dirname, 'Dummy/') + Name, () => {
      socket.emit('Done', { status: 'terminated' });
    })
  })
})

//////////////
