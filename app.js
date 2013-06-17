
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
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', handlers.index);
app.post('/connect', handlers.connect);
app.post('/send', handlers.send);
// only for testing
app.get('/test', handlers.test);

var server = http.createServer(app);
var io = sio.listen(server);
// Initialize socket.io message handling
handlers.init(io);

server.listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});
