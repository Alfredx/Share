/*
 * Providing some useful functions for the whole project.
 */

// namespace for Share
var sh = sh || {};

/**
 * Encode the dictionary into a valid url string.
 * @param  {Object} dict Just a dictionary containing some properties   .
 * @return {String}      Encoded url string. (No '?' in the front)
 */
sh.encodeDict = function(dict) {
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
sh.randomKey = function(len) {
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
sh.assert = function(predication, errorMessage) {
    if (!predication) {
        if (!errorMessage) {
            errorMessage = "Assertion failed";
        }

        alert(errorMessage);
        throw new Error(errorMessage);
    }
};


/**
 * Convert size to a string for display.
 * @param  {Number} size In bytes.
 * @return {String}      The string containing digits and units.
 */
sh.sizeToString = function(size) {
    /**
     * All available units.
     * @type {Array}
     */
    var units = ['B', 'KB', 'MB', 'GB'];

    /**
     * Unit => how many it needs to divide.
     * @type {Object}
     */
    var dividers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024
    };

    /**
     * Given a size, determine its unit.
     * @param  {Number} totalSize The size to determine.
     * @return {String}           The proper unit.
     */
    var determineUnit = function(totalSize) {
        for (var i = 0; i < units.length; i++) {
            if (totalSize < 1024) {
                return units[i];
            }

            totalSize /= 1024;
        }
        return units[units.length - 1];
    };

    var unit = determineUnit(size);
    var divider = dividers[unit];
    size /= divider;
    size = Math.round(size * 100) / 100;
    return size + unit;
};
