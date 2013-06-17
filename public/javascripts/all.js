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
 * No login required.
 * @type {String}
 */
var randomID = Math.floor(Math.random() * 10000);

/**
 * Is this page connected to server?
 * @type {Boolean}
 */
var isConnected = false;


/*
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
 */
xs.trySend = function() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) {
            showMessage("ID: " + randomID + "; AJAX status: " + xhr.readyState);
            return;
        }
        // Now it's ready
        if (xhr.status === 200) {
            showMessage(xhr.responseText);
        } else {
            showMessage("SOMEHOW FAILED: " + xhr.status);
        }
    };
    xhr.open('POST', '/connect', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    ctx = {
        'action': 'send',
        'randomID': randomID
    };
    xhr.send(xs.encodeDict(ctx));
};


/**
 * User triggers a web request to connect and receive files.
 */
xs.tryReceive = function() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) {
            showMessage("ID: " + randomID + "; AJAX status: " + xhr.readyState);
            return;
        }
        // Now it's ready
        if (xhr.status === 200) {
            showMessage(xhr.responseText);
        } else {
            showMessage("SOMEHOW FAILED: " + xhr.status);
        }
    };
    xhr.open('POST', '/connect', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    ctx = {
        'action': 'receive',
        'randomID': randomID
    };
    xhr.send(xs.encodeDict(ctx));
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

    // TODO: following needs to be put in somewhere else.
    socket.on('msg', function(data) {
        console.log("MSG received: " + data);
        socket.emit('browser', {
            'data': "HELLO ANDRIY"
        });
    });

    actButton.onclick = function() {
        if (selectedFile === null) {
            xs.tryReceive();
        } else {
            xs.trySend();
        }
    };
})();
