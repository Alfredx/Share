/*
 * Used for sending files.
 */

// xshare
var xs = xs || {};


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
var actButton = document.getElementById('actButton');


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
 * Update the description for files selected dynamically.
 */
fileField.addEventListener('change', function(evt) {
    var files = evt.target.files;
    if (files.length === 0) {
        outputField.innerHTML = "<ul></ul>";
        actButton.innerHTML = "Receive";
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

        results = "";
        // for (var k in f) {
        for (var k in selectedFile) {
            results += (k + " : " + f[k]);
            results += "<br/>";
        }
        output.push('<li>' + results + '</li>');
    }
    outputField.innerHTML = '<ul>' + output.join('') + "</ul>";
    actButton.innerHTML= "Send";
}, false);


/**
 * User triggers a web request to connect and send files.
 * @param  {Object} socket The socket in socket.io.
 */
var trySend = function(socket) {
    // TODO: @deprecated, can be changed to: send file after pairing
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) {
            showMessage("ID: " + id + "; AJAX status: " + xhr.readyState);
            return;
        }
        // Now it's ready
        if (xhr.status === 200) {
            showMessage(xhr.responseText);
        } else {
            showMessage("SOMEHOW FAILED: " + xhr.status);
        }
    };
    // TODO: change to another url
    xhr.open('POST', '/connect', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    ctx = {
        // TODO: pass the connection id rather than the user id
        'randomID': id
    };
    xhr.send(xs.encodeDict(ctx));
};


/**
 * User triggers a web request to connect and receive files.
 * @param  {Object} socket The socket in socket.io.
 */
var tryReceive = function(socket) {
    // TODO: @deprecated, may change to: new a url, click to open it in a new tab, then download a static file
};


/**
 * Try to pair another user to share files. (send or receive)
 * @param  {Object} socket The socket used in socket.io.
 */
var tryPair = function(socket) {
    if (!isConnected) {
        alert("Not connected to server => unable to share!");
        return;
    }

    if (selectedFile === null) {
        socket.emit('receive', {
            'id': id,
            // TODO: geo-location is not passed at present
            'geo': null
        });
        showMessage("Finding someone nearby to send files.. [me]" + id);
    } else {
        socket.emit('send', {
            'id': id,
            // TODO: geo-location is not passed at present
            'geo': null,
            'fileInfo': selectedFile
        });
        showMessage("Finding someone nearby to receive files.. [me]" + id);
    }
};


/**
 * After pairing succeeded, prepare to send files.
 * @param  {Number} partner The ID of the partner of this sharing.
 */
var prepareToSend = function(partner) {
    // TODO: finish this method
    showMessage('Prepare to send files to user ' + partner);
    console.log("Matched with " + partner + ", prepare to send files");
};


/**
 * After pairing succeeded, prepare to receive files.
 * @param  {Number} partner The ID of the partner of this sharing.
 */
var prepareToReceive = function(partner) {
    // TODO: finish this method
    showMessage('Prepare to receive files from user ' + partner);
    console.log("Matched with " + partner + ", prepare to receive files");
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

    // The followings are self-defined events.

    /**
     * Set the unique id for this connection.
     * @param  {Number} data The ID to be set.
     */
    socket.on('set_id', function(data) {
        id = data;
        showMessage('Connected, id is ' + data);
    });

    socket.on('receive', function(data) {
        prepareToReceive(data);
    });

    socket.on('send', function(data) {
        prepareToSend(data);
    });

    actButton.onclick = function() {
        tryPair(socket);
    };
})();
