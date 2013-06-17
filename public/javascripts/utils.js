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


/**
 * Generate a random string as key.
 * @param  {Number} len The length of generated key. Default to 16
 * @return {String}     The generated key.
 */
xs.randomKey = function(len) {
    var src = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789';
    var cs = [];

    if (!len) {
        len = 16;
    }

    for (var i = 0; i < len; i++) {
        cs.push(src.charAt(Math.floor(Math.random() * src.length)));
    }
    return cs.join('');
};


/**
 * Stop when something unexpected happens.
 * @param  {Boolean} predication The expression expected to be true.
 * @param  {String} errorMessage The message to display when predication is false.
 */
xs.assert = function(predication, errorMessage) {
    if (!predication) {
        if (!errorMessage) {
            errorMessage = "Assertion failed";
        }

        alert(errorMessage);
        throw new Error(errorMessage);
    }
};
