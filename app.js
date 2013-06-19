
/**
 * Module dependencies.
 */

var express = require('express');
var handlers = require('./routes/handlers');
var http = require('http');
var path = require('path');
var sio = require('socket.io');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser({
    uploadDir: "./tmp"
}));
app.use(express.methodOverride());
// randomly generated key
app.use(express.cookieParser('H9Ehmin9oIDgMLGV'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, "tmp")));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', handlers.index);
app.post('/upload', handlers.upload);
// only for testing
app.get('/test', handlers.test);

var server = http.createServer(app);
var io = sio.listen(server, {log: false});
// Initialize socket.io message handling
handlers.init(io);

server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
