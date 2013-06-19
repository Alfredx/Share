/*
 * Used for sending files.
 */

// xshare
var xs = xs || {};

// for debugging
var assert = xs.assert;


/**
 * Display the message to the page.
 * @param  {String} msg The message to present.
 */
var showMessage = function(msg) {
    var field = document.getElementById('status');
    field.innerHTML = msg;
};


// file selector
var fileField = document.getElementById('sendFile');
// output 
var outputField = document.getElementById('selectedList');
// send or receive
var sendButton = document.getElementById('sendButton');
var receiveButton = document.getElementById('receiveButton');
// progress bar for sharing
var progressBar = document.getElementById('uploadProgress');


/**
 * The information of file to send.
 * @type {Object}
 * NOTE: just handle one file for now.
 */
var selectedFile = null;


/**
 * The identification for a specific user.
 * Set by the server.
 * NOTE: No login required.
 * @type {Number}
 */
var id = null;


/**
 * Is this page connected to server?
 * @type {Boolean}
 */
var isConnected = false;


/**
 * Geo-location data:
    'latitude': {Number},
    'longitude': {Number},
    'accuracy': {Number}
 * @type {Object}
 */
var geo = null;


/**
 * Update the description for files selected dynamically.
 */
fileField.addEventListener('change', function(evt) {
    var files = evt.target.files;
    if (files.length === 0) {
        outputField.innerHTML = "<ul></ul>";
        sendButton.disabled = true;
        selectedFile = null;
        return;
    }

    output = [];
    for (var idx = 0, size = files.length; idx < size; idx++) {
        f = files[idx];
        selectedFile = {};
        // only the following properties are common
        properties = ['name', 'type', 'size', 'lastModifiedDate'];
        for (var i = 0, s = properties.length; i < s; i++) {
            var prop = properties[i];
            selectedFile[prop] = f[prop];
        }
        // save the File instance
        selectedFile['handle'] = f;

        results = "";
        // for (var k in f) {
        for (var k in selectedFile) {
            results += (k + " : " + f[k]);
            results += "<br/>";
        }
        output.push('<li>' + results + '</li>');
    }
    outputField.innerHTML = '<ul>' + output.join('') + "</ul>";
    sendButton.disabled = false;
}, false);


/**
 * User triggers a web request to connect and receive files.
 * @param  {Object} socket The socket in socket.io.
 */
var tryReceive = function(socket) {
    // TODO: @deprecated, may change to: new a url, click to open it in a new tab, then download a static file
};


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
    var hint = "Confirm to send '" + fileName + "' " +
               "(" + xs.sizeToString(fileSize) + ") " +
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
    var hint = "Confirm to receive '" + fileName + "' " +
               "(" + xs.sizeToString(fileSize) + ") " +
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


/**
 * Both users have confirmed, it's time to start sending.
 * @param  {Object} socket     The socket used in socket.io.
 * @param  {Number} conID      The ID of the connection.
 * @param  {Number} senderID   The ID of the sender.
 * @param  {Number} receiverID The ID of the receiver.
 */
var onStartSending = function(socket, conID, senderID, receiverID) {
    if (id === senderID) {
        // self is the sender
        assert(selectedFile !== null);

        // send files wrapped in a FormData using XHR2
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload?connectionID=' + conID, true);
        xhr.onload = function(e) {
            progressBar.hidden = true;
            if (this.status === 200) {
                showMessage("Uploading finished.");

                socket.emit('uploadSuccess', {
                    'connectionID': conID
                });
            } else {
                showMessage("Error uploading?!");
                console.log("ERROR uploading?");

                socket.emit('uploadFailed', {
                    'connectionID': conID
                });
            }
        };

        // update the progress bar while uploading
        progressBar.hidden = false;
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                var percent = e.loaded / e.total;
                progressBar.value = percent * 100;

                socket.emit('uploadProgress', {
                    'connectionID': conID,
                    'progress': Math.round(percent * 100)
                });
            }
        };

        var fd = new FormData();
        fd.append('uploadedFile', selectedFile['handle']);
        xhr.send(fd);
        showMessage("Confirmed, uploading now...");
    } else if (id === receiverID) {
        // self is the receiver
        showMessage("Confirmed, user " + senderID + " has started sending..");
    }
};


/**
 * Init and save the geolocation data.
 */
var initGeolocation = function() {
    var onSuccess = function(pos) {
        geo = {
            'latitude': pos.coords.latitude,
            'longitude': pos.coords.longitude,
            'accuracy': pos.coords.accuracy
        };
    };
    var onError = function(err) {
        var errors = {
            1: "Authorization fails",           // permission denied
            2: "Can't detect your location",    // position unavailable
            3: "Connection timeout"             // timeout
        };
        showMessage("Error retrieving GEO-LOCATION: " + errors[err.code]);
    };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true
    });
};


/**
 * Init and try to connect to server.
 */
(function() {
    // Check for the various File API support.
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        alert('The File APIs are not fully supported in this browser.');
        return;
    } else if (!window.XMLHttpRequest) {
        // TODO: after socket.io, AJAX checking is needed?
        alert("Your browser doesn't support AJAX.");
        return;
    }
    // All APIs supported

    var socket = io.connect('/');

    socket.on('connecting', function() {
        isConnected = false;
        showMessage("Connecting to server..");
    });
    socket.on('connect', function() {
        isConnected = true;
        showMessage('Connected!');
    });
    socket.on('disconnect', function() {
        isConnected = false;
        showMessage('Disconnected from server..');
    });
    socket.on('connect_failed', function() {
        isConnected = false;
        showMessage('Failed to connect server, is the network working?');
    });
    socket.on('error', function() {
        // something bad happened..
        showMessage('Error happened.. Why?');
        console.log('Error happened.. Why?');
    });

    /**
     * Set the unique id for this connection.
     * @param  {Number} data The ID to be set.
     */
    socket.on('setID', function(data) {
        id = data;
        showMessage('Connected, id is ' + data);
    });

    /**
     * Successfully making a pair, confirm sending files to it?
     * @param  {Object} data A JSON object that contains multiple info.
     */
    socket.on('confirmSend', function(data) {
        confirmToSend(socket, data.partnerID, data.fileName, data.fileSize, data.connectionID);
    });

    /**
     * Successfully making a pair, confirm receiving files from it?
     * @param  {Object} data A JSON object that contains multiple info.
     */
    socket.on('confirmReceive', function(data) {
        confirmToReceive(socket, data.partnerID, data.fileName, data.fileSize, data.connectionID);
    });

    /**
     * Failed making a pair.
     */
    socket.on('pairFailed', function() {
        showMessage("Failed making a pair. It seems nobody is nearby.");
    });

    /**
     * After successfully pairing, the partner chose not to share.
     */
    socket.on('betrayed', function(data) {
        showMessage("Your partner (User " + data.partnerID + ") chose not to share files with you..");
    });

    /**
     * Both users confirmed, it's time to start sending.
     */
    socket.on('startSending', function(data) {
        onStartSending(socket, data.connectionID, data.senderID, data.receiverID);
    });

    /**
     * The sender has updated its uploading progress.
     */
    socket.on('uploadProgress', function(data) {
        showMessage("Uploading " + data.progress + "%");
    });

    /**
     * The sender has finished uploading.
     */
    socket.on('uploadSuccess', function(data) {
        showMessage("Uploading finished!");
        // TODO: it's time to download!
    });

    /**
     * The uploading somehow failed..
     */
    socket.on('uploadFailed', function(data) {
        showMessage("Uploading failed...");
    });

    /*
     * Retrieve geo-location if possible.
     */
    if (navigator.geolocation) {
        initGeolocation();
    }

    sendButton.onclick = function() {
        pairToSend(socket);
    };

    receiveButton.onclick = function() {
        pairToReceive(socket);
    };
})();
