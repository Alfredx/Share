/**
 *	deprecated user logic functions and variables
 */

var TESTSWITCH = true;

/**
 * Try to pair another user to share files. (send)
 * @param  {Object} socket The socket used in socket.io.
 */
var pairToSend = function(socket) {
    if (!isConnected) {
        alert("Not connected to server => unable to share!");
        return;
    }

    assert (selectedFile !== null);

    /*
     * Retrieve geo-location every time when you are about to send a file.
     */
    if (navigator.geolocation) {
        getGeolocation();
    }
    else{
	   showMessage("Your browser does not support Geolocation",'geo');
       return;
    }

    socket.emit('pairToSend', {
        'id': id,
        'geo': geo,
        'fileInfo': selectedFile
    });
    showMessage("Finding someone to receive files.. [me]" + id);
};


/**
 * Try to pair another user to share files. (receive)
 * @param  {Object} socket The socket used in socket.io.
 */
var pairToReceive = function(socket) {
    if (!isConnected) {
        alert("Not connected to server => unable to share!");
        return;
    }

    socket.emit('pairToReceive', {
        'id': id,
        'geo': geo
    });
    showMessage("Finding someone nearby to send files.. [me]" + id);
};


/**
 * After pairing succeeded, confirm to send files.
 * @param  {Object} socket    The socket used in socket.io.
 * @param  {Number} partner   The ID of the partner of this sharing.
 * @param  {String} fileName  The name of the file to send.
 * @param  {Number} fileSize  The size of the file to send.
 * @param  {Number} conID     The ID of the connection.
 */
var confirmToSend = function(socket, partnerID, fileName, fileSize, conID) {
    if(TESTSWITCH){
        socket.emit('confirmed', {
            'connectionID': conID,
            'myID': id,
            'partnerID': partnerID
        });
        return;
    }
    var hint = "Confirm to send '" + fileName + "' " +
               "(" + sh.sizeToString(fileSize) + ") " +
               "to user " + partnerID;
    if (confirm(hint)) {
        // confirmed, ready for sending
        socket.emit('confirmed', {
            'connectionID': conID,
            'myID': id,
            'partnerID': partnerID
        });
        showMessage('Confirmed to send files to user ' + partnerID + ', waiting for his/her response..');
    } else {
        // not confirmed, tell the other user
        socket.emit('confirmFailed', {
            'connectionID': conID,
            'myID': id,
            'partnerID': partnerID
        });
        showMessage('You chose not to send files to user ' + partnerID);
    }
};


/**
 * After pairing succeeded, confirm to receive files.
 * @param  {Object} socket    The socket used in socket.io.
 * @param  {Number} partner   The ID of the partner of this sharing.
 * @param  {String} fileName  The name of the file to send.
 * @param  {Number} fileSize  The size of the file to send.
 * @param  {Number} conID     The ID of the connection.
 */
var confirmToReceive = function(socket, partnerID, fileName, fileSize, conID) {
    if(TESTSWITCH){
        socket.emit('confirmed', {
            'connectionID': conID,
            'myID': id,
            'partnerID': partnerID
        });
        return;
    }
    var hint = "Confirm to receive '" + fileName + "' " +
               "(" + sh.sizeToString(fileSize) + ") " +
               "from user " + partnerID;
    if (confirm(hint)) {
        // confirmed, ready for receiving
        socket.emit('confirmed', {
            'connectionID': conID,
            'myID': id,
            'partnerID': partnerID
        });
        showMessage('Confirmed to receive files from user ' + partnerID + ', waiting for his/her response..');
    } else {
        // not confirmed, tell the other user
        socket.emit('confirmFailed', {
            'connectionID': conID,
            'myID': id,
            'partnerID': partnerID
        });
        showMessage('You chose not to receive files from user ' + partnerID);
    }
};