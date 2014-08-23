// IMPORT NODEJS MODULES
var express = require('express');
var engines = require('consolidate');
var nunjucks = require('nunjucks');
var fs = require('fs');
var crypto = require('crypto');
var views = require('./main/views.js');
var passport = require('passport');
var passportSocketIo = require("passport.socketio");

// SECURITY
var privateKey = fs.readFileSync('cert/privatekey.pem').toString();
var certificate = fs.readFileSync('cert/certificate.pem').toString();
var options = {key:privateKey,cert:certificate};

// INSTANTIATE APP AND CONNECT WITH SERVER AND SOCKET.IO
var APP = express();
var SERVER = require('https').createServer(options,APP);
var SOCKET_IO = require('socket.io').listen(SERVER);
var PORT = 443; // sudo to use this port

// DIRECTORY REFERENCES
var TEMPLATE_DIRECTORY = './main/templates';
var STATIC_DIRECTORY = './main/static';
var MEDIA_DIRECTORY = './main/media';

// SESSION REFERENCES
var SESSION_STORE = new express.session.MemoryStore({reapInterval: 60000 * 10});
var SESSION_SECRET = 'secret';
var SESSION_KEY = 'express.sid';

// CONFIGURE APPLICATION
APP.configure(function()
{
    APP.use(express.bodyParser());
    APP.use(express.cookieParser());

    APP.use(express.session({
        secret: SESSION_SECRET,
        store:  SESSION_STORE,
        key:    SESSION_KEY,
        cookie: { secure: true }
    }));

    APP.use(passport.initialize());
    APP.use(passport.session());

    APP.use(APP.router);
    APP.use("/static", express.static(STATIC_DIRECTORY));
    APP.use("/media", express.static(MEDIA_DIRECTORY));
});

// CONFIG NUNJUCKS AND CONNECT WITH VIEWS
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader(TEMPLATE_DIRECTORY));
require('./main/envFilters.js')(env);
env.express(APP);
views.setEnvironment(env);

// CONFIG PASSPORT AND CONNECT WITH VIEWS
require('./main/authSettings.js')(passport);
views.setPassport(passport);

// URL MATCHING
require('./main/urls.js')(APP);

// CONFIG AND BIND SOCKET EVENTS
SOCKET_IO.set("authorization", passportSocketIo.authorize({
    cookieParser:   express.cookieParser,   //or connect.cookieParser
    key:            SESSION_KEY,            //the cookie where express (or connect) stores its session id.
    secret:         SESSION_SECRET,         //the session secret to parse the cookie
    store:          SESSION_STORE           //the session store that express uses
}));
require('./main/socketEvents.js')(SOCKET_IO);

// LAUNCH SERVER
SERVER.listen(PORT, function()
{
    console.log('Listening on port ' + PORT);
});