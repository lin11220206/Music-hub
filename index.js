var http = require('http');
var path = require('path');

var q = require('q')
var socketio = require('socket.io');
var express = require('express');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');
var passport = require('passport');
var ejs = require('ejs');
var nodemailer = require('nodemailer');
var config = require('./config')

var mongoose = require('mongoose');
mongoose.Promise = q.Promise;

mongoose.connect(config.mongodbPath);

// Load Events
var AuthError = require("./events/auth_error");
var SettingSuccess = require("./events/setting_success");
var SettingError = require("./events/setting_error");

// Load models
var User = require("./models/user")(mongoose);

// Setup server
var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);

server.on('error', console.error.bind(console));
app.on('error', console.error.bind(console));
io.on('error', console.error.bind(console));

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

app.use(morgan('combined'))
app.use(cookieParser())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(flash());
var sess = {
  secret: 'keyboard cat',
  cookie: {}
}
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}
app.use(session(sess))


var service = {
  EmailSender: nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: config.gmail.GMAIL_ACCOUNT,
          pass: config.gmail.GMAIL_PASSWORD
      }
  })
}

var authRouteSetup = require("./routes/auth");
var registerRouteSetup = require("./routes/register");
var settingRouterSetup = require("./routes/setting");
var sheetRouterSetup = require("./routes/sheet");

authRouteSetup(app, config, service);
registerRouteSetup(app, config, service);
settingRouterSetup(app, config, service);
sheetRouterSetup(app, config, service);

app.use(express.static(path.resolve(__dirname, 'public')));

server.listen(config.port, config.ip, function(){
  var addr = server.address();
  console.log("server listening at", addr.address + ":" + addr.port);
});



//fix exit Handler
process.stdin.resume();//so the program will not close instantly
process.nextTick(function() {
    function exitHandler(options, err) {
        if (options.cleanup) console.log('clean');
        if (err) console.log(err.stack);
        if (options.exit) {
            process.nextTick(function() {
                process.exit();
                //make sure a clear shut down and will not exit until all exit call finished
            })
            
        };
    }

    //do something when app is closing
    process.on('exit', exitHandler.bind(null,{cleanup:true}));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {exit:true}));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
});

