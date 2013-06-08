/*
 * Handling requests for each url.
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

    var body =
        '<html>' +
            '<head>' +
                '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />' +
            '</head>' +
            '<body>' +
                '<form action="/upload" enctype="multipart/form-data" method="post">' +
                    '<input type="file" name="upload">' +
                    '<input type="submit" value="Upload file" />' +
                '</form>'+
            '</body>' +
        '</html>';

    response.writeHead(200, {
        "Content-Type": "text/html"
    });
    response.write(body);
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
