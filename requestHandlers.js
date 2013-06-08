/*
 * Handling requests for each url.
 */

var url = require("url");
var querystring = require("querystring");

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
function hello(response, postData) {
    console.log("In function hello");

    var sleep = function(milliSeconds) {
        var startTime = new Date().getTime();
        while (new Date().getTime() < startTime + milliSeconds);
    };

    var body = '<html>'+
        '<head>'+
        '<meta http-equiv="Content-Type" content="text/html; '+
        'charset=UTF-8" />'+
        '</head>'+
        '<body>'+
        '<form action="/upload" method="post">'+
        '<textarea name="text" rows="20" cols="60"></textarea>'+
        '<input type="submit" value="Submit text" />'+
        '</form>'+
        '</body>'+
        '</html>';

    response.writeHead(200, {
        "Content-Type": "text/html"
    });
    response.write("Running hello()");
    response.write(body);
    response.write('\n');
    response.write("By Andriy");
    response.end();
}


function upload(response, postData) {
    console.log("In function world");

    data = querystring.parse(postData)['text'];

    response.writeHead(200, {
        "Content-Type": "text/plain"
    });
    response.write("Running upload()");
    response.write('\n');
    response.write(data);
    response.write('\n');
    response.write("By Andriy");
    response.end();
}


exports.hello = hello;
exports.upload = upload;
