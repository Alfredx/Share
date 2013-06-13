/*
 * Old codes while learning, may not be useful in Express framework.
 * You can just ignore this file. It's only for reference.
 */


/*
 * formidable.js
 */

var formidable = require('formidable');
var http = require('http');
var sys = require('sys');

http.createServer(function(req, res) {
  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      res.end(sys.inspect({fields: fields, files: files}));
    });
    return;
  }

  // show a file upload form
  res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<form action="/upload" enctype="multipart/form-data" '+
    'method="post">'+
    '<input type="text" name="title"><br>'+
    '<input type="file" name="upload" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
}).listen(8888);

/*
 * end of formidable.js
 */


/*
 * index.js
 */

var server = require("./server.js");
var router = require("./router.js");
var requestHandlers = require("./requestHandlers");


handle = {};
handle['/'] = requestHandlers.hello;
handle['/hello'] = requestHandlers.hello;
handle['/upload'] = requestHandlers.upload;
handle['/show'] = requestHandlers.show;

server.start(router.route, handle);

/*
 * end of index.js
 */


/*
 * requestHandlers.js
 */

var url = require("url");
var querystring = require("querystring");
var fs = require("fs");
var formidable = require("formidable");

/*
// .pathname => pathname
parsed_result = url.parse(fullURL);
// [key] => value
query_dict = querystring.parse(parsed_result.query);
*/


/**
 * Testing function, for /hello.
 * @param  {Object} request  The full request Object.
 * @param  {Object} response The full response object.
 * @return none.
 */
function hello(request, response) {
    console.log("In function hello()");

    var sleep = function(milliSeconds) {
        var startTime = new Date().getTime();
        while (new Date().getTime() < startTime + milliSeconds);
    };

    response.writeHead(200, {
        "Content-Type": "text/html"
    });
    response.write("");
    response.end();
}


function upload(request, response) {
    console.log("In function upload()");

    var form = new formidable.IncomingForm();
    console.log("   About to parse");
    form.parse(request, function(err, fields, files) {
        console.log("   Parsing done");
        fs.renameSync(files.upload.path, "./tmp/test.png");
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write("Received img: <br/>");
        response.write('<img src="/show"/>');
        response.end();
    });
}


function show(request, response) {
    console.log("In function show()");
    fs.readFile("./tmp/test.png", "binary", function(error, file) {
        if (error) {
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write("Error: " + error);
        } else {
            response.writeHead(200, {"Content-Type": "image/png"});
            response.write(file, "binary");
        }
        response.end();
    });
}


exports.hello = hello;
exports.upload = upload;
exports.show = show;

/*
 * end of requestHandlers.js
 */


/*
 * router.js
 */

/**
 * The real routing method
 * @param  {String} pathName The path name in url.
 * @param  {Object} handle The key-value dict for mapping url to its handler functions.
 * @param  {Object} request The full request object.
 * @param  {Object} response The full response object.
 */
function route(pathName, handle, request, response) {
    if (typeof handle[pathName] === 'function') {
        handle[pathName](request, response);
    } else {
        // 404 page.
        console.log("NO MAPPING?! " + pathName);
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not found for " + pathName);
        response.end();
    }
}

exports.route = route;

/*
 * end of router.js
 */


/*
 * server.js
 */

var http = require("http");
var url = require("url");

/**
 * Start listening and responding.
 * @param  {Function} route Routing the requests to its handlers
 * @param  {Object} handle The key-value dict of mapping urls to handler functions.
 */
function start(route, handle) {
    var onRequest = function(request, response) {
        postData = "";
        var pathName = url.parse(request.url).pathname;
        console.log("Request for " + pathName + " received.");

        route(pathName, handle, request, response);
    };

    http.createServer(onRequest).listen(8000);
    console.log("Server started");
}


exports.start = start;

/*
 * end of server.js
 */
