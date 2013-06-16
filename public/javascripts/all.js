/*
 * Used for sending files.
 */

// xshare
var xs = xs || {};


// file selector
xs.fileField = document.getElementById('sendFile');
// output 
xs.outputField = document.getElementById('selectedList');
// send or receive
xs.actButton = document.getElementById('actButton');
// file to send
// NOTE: just handle one file for now
xs.selectedFile = null;

xs.randomID = Math.floor(Math.random() * 10000);


/**
 * Display the message to the page.
 * @param  {String} msg The message to present.
 */
xs.showMessage = function(msg) {
    var field = document.getElementById('status');
    field.innerHTML = msg;
};


/*
 * Update the description for files selected dynamically.
 */
xs.fileField.addEventListener('change', function(evt) {
    var files = evt.target.files;
    if (files.length === 0) {
        xs.outputField.innerHTML = "<ul></ul>";
        xs.actButton.innerHTML = "Receive";
        xs.selectedFile = null;
        return;
    }

    output = [];
    for (var idx = 0, size = files.length; idx < size; idx++) {
        f = files[idx];
        xs.selectedFile = {};
        // only the following properties are common
        properties = ['name', 'type', 'size', 'lastModifiedDate'];
        for (var i = 0, s = properties.length; i < s; i++) {
            var prop = properties[i];
            xs.selectedFile[prop] = f[prop];
        }

        results = "";
        // for (var k in f) {
        for (var k in xs.selectedFile) {
            results += (k + " : " + f[k]);
            results += "<br/>";
        }
        output.push('<li>' + results + '</li>');
    }
    xs.outputField.innerHTML = '<ul>' + output.join('') + "</ul>";
    xs.actButton.innerHTML= "Send";
}, false);


/**
 * User triggers a web request to connect and send files.
 */
xs.trySend = function() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) {
            xs.showMessage("ID: " + xs.randomID + "; AJAX status: " + xhr.readyState);
            return;
        }
        // Now it's ready
        if (xhr.status === 200) {
            xs.showMessage(xhr.responseText);
        } else {
            xs.showMessage("SOMEHOW FAILED: " + xhr.status);
        }
    };
    xhr.open('POST', '/connect', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    ctx = {
        'action': 'send',
        'randomID': xs.randomID
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
            xs.showMessage("ID: " + xs.randomID + "; AJAX status: " + xhr.readyState);
            return;
        }
        // Now it's ready
        if (xhr.status === 200) {
            xs.showMessage(xhr.responseText);
        } else {
            xs.showMessage("SOMEHOW FAILED: " + xhr.status);
        }
    };
    xhr.open('POST', '/connect', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    ctx = {
        'action': 'receive',
        'randomID': xs.randomID
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
    xs.actButton.onclick = function() {
        if (xs.selectedFile === null) {
            xs.tryReceive();
        } else {
            xs.trySend();
        }
    };
})();
