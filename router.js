/*
 * Redirects each request from different url to its handlers.
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
