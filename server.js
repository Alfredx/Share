/*
 * Server
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
