/*
 * Used for sending files.
 */

// namespace for Share
var sh = sh || {};

// for debugging
var assert = sh.assert;


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
// the <a> for downloading
var downloadLink = document.getElementById('downloadLink');
// canvas to show image
var canvasField = document.getElementById('canvas');

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
 * The context of canvas
 * @type {Object}
 */
var context = canvas.getContext('2d');

/**
 *  The image object that displays the file
 *  @type {Object}
 */
 var img;

/**
 * Update the description for files selected dynamically.
 */
fileField.addEventListener('change', function(evt) {
    var files = evt.target.files;
    if (files.length == 0) {
        outputField.innerHTML = "<ul></ul>";
        sendButton.disabled = true;
        selectedFile = null;
        //clear canvas
        canvas.width = canvas.width;
        return;
    }

    output = [];
    for (var idx = 0, size = files.length; idx < size; idx++) {
        f = files[idx];
        drawImageOnCanvas(f);

        selectedFile = {};
        // only the following properties are common
        properties = ['name', 'type', 'size', 'lastModifiedDate'];
        for (var i = 0, s = properties.length; i < s; i++) {
            var prop = properties[i];
            selectedFile[prop] = f[prop];
        }

        // save the File instance, it will be used later in XHR2
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
 *  Draw the selected file in canvas
 *  @param f {Object} The file just selected
 *  NOTE: only image file can be showed in canvas
 */
var drawImageOnCanvas = function(f){
    //show in canvas;
    img = new Image();
    var url = window.URL || window.webkitURL;
    var src = url.createObjectURL(f);
    img.src = src;
    img.onload = function(){
        context.drawImage(img,0,0,400,img.height*(400/img.width));
        setMouseEvent();
        url.revokeObjectURL(src);
    }
};

/**
 *  Add mouse event in to canvas
 */
var setMouseEvent = function(){
    // var canvasOffset = canvas.offset();
    var offsetX = canvas.offsetLeft;
    var offsetY = canvas.offsetTop;
    var imgX = img.offsetLeft;
    var imgY = img.offsetTop;
    console.log(offsetX + " " + offsetY);
    var isDragging = false;
    var isDraggable = false;
    var canMouseX = 0;
    var canMouseY = 0;

    function checkMouseInArea(){
        if(canMouseX < imgX || canMouseX > imgX+400 || canMouseY < imgY || canMouseY > imgY+img.height*(400/img.width))
            isDraggable = false;
        else
            isDraggable = true;
        return isDraggable;
    };

    function onMouseDown(event){
        canMouseX = parseInt(event.layerX);
        canMouseY = parseInt(event.layerY);
        if(!checkMouseInArea())
            return;
        imgOffsetX = canMouseX - imgX;
        imgOffsetY = canMouseY - imgY;
        isDragging = true;
    };

    function onMouseUp(event){
        canMouseX = parseInt(event.layerX);
        canMouseY = parseInt(event.layerY);
        isDragging = false;
        isDraggable = false;
    };

    function onMouseOut(event){
        canMouseX = parseInt(event.layerX);
        canMouseY = parseInt(event.layerY);
        isDragging = false;
        isDraggable = false;
    };

    function onMouseMove(event){
        if(!isDraggable)
            return;
        var oldX = canMouseX, oldY = canMouseY;
        canMouseX = parseInt(event.layerX);
        canMouseY = parseInt(event.layerY);
        imgX += (canMouseX-oldX);
        imgY += (canMouseY-oldY);
        if(isDragging){
            canvas.width = canvas.width;
            context.drawImage(img,canMouseX-imgOffsetX,canMouseY-imgOffsetY,400,img.height*(400/img.width));
            console.log(canMouseX + " " +canMouseY);
        }
    };
    
    function onTouchStart(event){
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        if(!checkMouseInArea())
            return;
        imgOffsetX = canMouseX - imgX;
        imgOffsetY = canMouseY - imgY;
        isDragging = true;
    };

    function onTouchEnd(event){
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        isDragging = false;
        isDraggable = false;
    };

    function onTouchMove(event){
        if(!isDraggable)
            return;
        event.preventDefault();
        var oldX = canMouseX, oldY = canMouseY;
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        imgX += (canMouseX-oldX);
        imgY += (canMouseY-oldY);
        if(isDragging){
            canvas.width = canvas.width;
            context.drawImage(img,canMouseX-imgOffsetX,canMouseY-imgOffsetY,400,img.height*(400/img.width));
            console.log(canMouseX + " " +canMouseY);
        }
    };

    function onTouchCancel(event){
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        isDragging = false;
        isDraggable = false;
    }
            //console.log(canMouseX + " " +canMouseY);


    canvas.onmousedown = onMouseDown;
    canvas.onmouseup = onMouseUp;
    canvas.onmouseout = onMouseOut;
    canvas.onmousemove = onMouseMove;
    canvas.addEventListener("touchstart", onTouchStart, false);
    canvas.addEventListener("touchmove", onTouchMove, false);
    canvas.addEventListener("touchend", onTouchEnd, false);
    canvas.addEventListener("touchcanvel", onTouchCancel, false);

}




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
	showMessage("Your browser does not support Geolocation");
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
            } else {
                showMessage("Error uploading?!");
                console.log("ERROR uploading?");
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
var getGeolocation = function() {
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
        showMessage("Ready to receive!");

        downloadLink.href = data.fileURL;
        downloadLink.click();
    });

    /**
     * The uploading somehow failed..
     */
    socket.on('uploadFailed', function(data) {
        showMessage("Uploading failed...");
    });
    
    /**
     * Try to get geolocation on initialization
     *
     */
    if (navigator.geolocation) {
        getGeolocation();
    }
    else{
	   showMessage("Your browser does not support Geolocation");
    }

    sendButton.onclick = function() {
        pairToSend(socket);
    };

    receiveButton.onclick = function() {
        pairToReceive(socket);
    };

    // var mouseEventTypes = {
    //     touchstart : "mousedown",
    //     touchmove : "mousemove",
    //     touchend : "mouseup"
    // };

    // for (originalType in mouseEventTypes) {
    //     document.addEventListener(originalType, function(originalEvent) {
    //         event = document.createEvent("MouseEvents");
    //         touch = originalEvent.changedTouches[0];
    //         event.initMouseEvent(mouseEventTypes[originalEvent.type], true, true,
    //                             window, 0, touch.screenX, touch.screenY, touch.clientX,
    //                             touch.clientY, touch.ctrlKey, touch.altKey, touch.shiftKey,
    //                             touch.metaKey, 0, null);
    //         originalEvent.target.dispatchEvent(event);
    //     });
    // }
})();
