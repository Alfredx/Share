/*
 * Providing some useful functions for the whole project.
 */

// xshare
var xs = xs || {};

/**
 * Encode the dictionary into a valid url string.
 * @param  {Object} dict Just a dictionary containing some properties   .
 * @return {String}      Encoded url string. (No '?' in the front)
 */
xs.encodeDict = function(dict) {
    var strs = [];
    for (var k in dict) {
        strs.push(encodeURIComponent(k) + '=' + encodeURIComponent(dict[k]));
    }
    return strs.join('&');
};
