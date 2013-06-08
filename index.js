/*
 * The access point. 
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
