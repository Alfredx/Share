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
// buttons
var sendButton = document.getElementById('sendButton');
var receiveButton = document.getElementById('receiveButton');
var pairButton = document.getElementById('pairButton');
var pairSendButton = document.getElementById('pairSendButton');
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
 var img = null;

/**
 *  The width and height of the image on canvas
 *  @type {Number}
 *  NOTE: to make the image fit screen, 
 *        the width and height is not the same as img.width or img.height
 */
 var imgWidth = 0;
 var imgHeight = 0;

/**
 *  Socket for connection
 *  @type {Object}
 */
 var socket;

 var gConID;
 var gPartnerID;

 var isPaired = false;

var SLICE = true;

var BYTES_PER_CHUNK = 1024*50;

 /**
  * Show if all chunks are received
  */
 var isFileCompleted = true;
 var isFileSent = false;
 var isFileDownloading = false;

/**
 *  File Matrix. To save all the chunks received
 *  @type {Array}
 */
var fileMatrix = null;


var currentChunk = 0;

var TESTSWITCH = true;


window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || 
                                           window.webkitResolveLocalFileSystemURL;

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
        img = null;
        return;
    }

    output = [];
    for (var idx = 0, size = files.length; idx < size; idx++) {
        f = files[idx];
        var url = window.URL || window.webkitURL;
        var src = url.createObjectURL(f);
        drawImageOnCanvas(src,0,0);

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
    isFileCompleted = false;
    isFileSent = false;
}, false);

/**
 *  Draw the selected file in canvas
 *  @param f {Object} The file just selected
 *  NOTE: only image file can be showed in canvas
 */
var drawImageOnCanvas = function(src,x,y){
    //show in canvas;
    
    img = new Image();
    img.src = src;

    img.onload = function(){
        imgWidth = 400;
        imgHeight = img.height*(imgWidth/img.width);
        // context.clearRect(0,0,canvas.width,canvas.height);
        canvas.width = canvas.width;
        if(x+imgWidth > 0)
            context.drawImage(img,x,y,imgWidth,imgHeight);
        setMouseEvent();
        
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
    var isDragging = false;
    var isDraggable = false;
    var canMouseX = 0;
    var canMouseY = 0;

    function checkMouseInArea(){
        if(canMouseX < imgX || canMouseX > imgX+imgWidth || canMouseY < imgY || canMouseY > imgY+imgHeight)
            isDraggable = false;
        else
            isDraggable = true;
        return isDraggable;
    };

    function isMouseInSendArea(){
        // if((canMouseX <= 100) || (canMouseX >= canvas.width-100))
        //     return true;
        // else
        //     return false;
        var result = (imgX+img.width) > canvas.width
        return result;
    }

    function isImgInCanvas(){
        // if(imgY >= 0 && imgY+imgHeight < canvas.height)
        //     return true;
        // else 
        //     return false;
        //TODO: can I drag up to send an img
        return true;
    }

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
        // if(isMouseInSendArea() && isDragging)
        //     pairToSend(socket);
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
        if(!isImgInCanvas())
            return;
        if(isDragging){
            canvas.width = canvas.width;
            context.drawImage(img,canMouseX-imgOffsetX,canMouseY-imgOffsetY,imgWidth,imgHeight);
            var okToSend = isMouseInSendArea() && !isFileSent;
            if(okToSend){
                pairToSend(socket);
            }
            sendImageCoords(socket,canMouseX-imgOffsetX-canvas.width,canMouseY-imgOffsetY);
            //console.log(canMouseX + " " +canMouseY);
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
        // canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        // canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        isDragging = false;
        isDraggable = false;
        // if(isMouseInSendArea())
        //     pairToSend(socket);

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
        if(!isImgInCanvas())
            return;
        if(isDragging){
            canvas.width = canvas.width;
            context.drawImage(img,canMouseX-imgOffsetX,canMouseY-imgOffsetY,imgWidth,imgHeight);
            var okToSend = isMouseInSendArea() && !isFileSent;
            if(okToSend){
                pairToSend(socket);
            }
            sendImageCoords(socket,canMouseX-imgOffsetX-canvas.width,canMouseY-imgOffsetY);
        }
    };

    function onTouchCancel(event){
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        isDragging = false;
        isDraggable = false;
        // if(isMouseInSendArea())
        //     pairToSend(socket);
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

var sendImageCoords = function(socket,x,y) {
    if(!isFileSent)
        return;
    socket.emit('imageCoords', {
        'sender':id,
        'conID':gConID,
        'X':x,
        'Y':y
    })
};

/**
 *  Try to find a pair but not send files
 *  @param {Object} socket The socket used in socket.io
 */
 var findPair = function(socket) {
    if (!isConnected) {
        alert("Not connected to server => unable to share!");
        return;
    }
    if (navigator.geolocation) {
        getGeolocation();
    }
    else{
       showMessage("Your browser does not support Geolocation");
       return;
    }
    socket.emit('findPair',{
        'id': id,
        'geo':geo
    });
    showMessage("Finding the nearest user for you.. [me]" + id);
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

    /*
     * Retrieve geo-location every time when you are about to send a file.
     */
    if (navigator.geolocation) {
        getGeolocation();
    }
    else{
	   showMessage("Your browser does not support Geolocation");
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

var pairedSend = function(socket){
    socket.emit('partnerEcho', {
        'id':id,
        'conID':gConID,
        'partnerID':gPartnerID
    });
    // if(isPaired){
    //     alert(id+" "+gPartnerID);
    //     onStartSending(socket,gConID,id,gPartnerID);
    // }
    // else{
    //     showMessage("you don't have a partner yet");
    // }

}


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
        if(SLICE){
            sliceAndSend(conID);
        }
        else{
            sendAsOneFile(socket, conID);
        }
        
        showMessage("Confirmed, uploading now...");
    } else if (id === receiverID) {
        // self is the receiver
        showMessage("Confirmed, user " + senderID + " has started sending..");
    }
};


var sendAsOneFile = function(socket, conID){
    //send files wrapped in a FormData using XHR2
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
}

var sliceAndSend = function(conID) {
    
    var blob = selectedFile['handle'];
    
    var SIZE = blob.size;

    var seq = 0;
    var start = 0;
    var end = BYTES_PER_CHUNK;

    var MAXSEQ = parseInt(SIZE/BYTES_PER_CHUNK)

    while(start < SIZE) {
        if('mozSlice' in blob){
            var chunk = blob.mozSlice(start, end);
        }
        else if('webkitSlice' in blob){
            var chunk = blob.webkitSlice(start,end);
        }
        else{
            var chunk = blob.slice(start, end);
        }
        chunk.path = blob.path;

        var fd = new FormData();
        fd.append('uploadedChunk',chunk);
        fd.append('seq',seq);
        fd.append('maxseq',MAXSEQ);
        fd.append('sender',id);

        uploadAChunk(fd,seq++,conID);

        start = end;
        end = start + BYTES_PER_CHUNK;
        if(end > SIZE)
            end = SIZE;
    }
    isFileSent = true;
}

var uploadAChunk = function(chunk, seq, conID) {
    // send files wrapped in a FormData using XHR2
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload?connectionID=' + conID, true);
    xhr.onload = function(e) {
        progressBar.hidden = true;
        if (this.status === 200) {
            showMessage("Uploading finished. seq:"+seq);
        } else {
            showMessage("Error uploading?!");
            console.log("ERROR uploading?");
        }
    };

    xhr.send(chunk);
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

var initFileMatrix = function(maxseq) {
    if(isFileCompleted){
        fileMatrix = new Array(maxseq+2);
        for (var i = 0; i < maxseq+2; i++) {
            fileMatrix[i] = null;
        };
        currentChunk = 0;
        isFileCompleted = false;
    }
};

var regroupSlicedFile = function(responseBlob, seq, maxseq, fileName, socket){
    window.requestFileSystem(TEMPORARY, 5*1024*1024, function(fs){
        fs.root.getFile(fileName, {create:true},function(fileEntry){
            entry = fileEntry;
            fileEntry.createWriter(function(writer){
                filewriter = writer;
                filewriter.onwriteend = function(){
                    if(fileMatrix[0]){
                        if(fileMatrix[currentChunk+1]){
                            console.log("currentChunk: " + currentChunk);
                            console.log("length: "+filewriter.length);
                            filewriter.seek(filewriter.length);
                            filewriter.write(fileMatrix[currentChunk+1]);
                            currentChunk++;
                            if(currentChunk == maxseq){
                                isFileCompleted = true;
                                showMessage("all part received");
                                filewriter = null;
                            }
                            console.log("isFileCompleted " + isFileCompleted);
                        }
                        else{
                            console.log("chunk at "+(currentChunk+1)+" is null");
                        }
                        //drawImageOnCanvas(fileMatrix[0].toURL(),0,0);
                    }
                    else{
                        console.log("onwriteend called but file is null");
                    }
                };
                if(seq == 0){
                    filewriter.write(responseBlob);
                    fileMatrix[0] = fileEntry;
                }
                else{
                    fileMatrix[seq] = responseBlob;
                    if(filewriter.readyState != 1){
                        filewriter.onwriteend();
                    }
                }
            },function(error){
                console.log("error when creating writer");
            });  
        },function(err){
            console.log("error when creating file: " + fileName);
        });
    },function(err){
        console.log("error when requesting FS");
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

    socket = io.connect('/');

    socket.on('connecting', function() {
        isConnected = false;
        showMessage("Connecting to server..");
    });
    socket.on('connect', function() {
        isConnected = true;
        showMessage('Connected!');
    });
    socket.on('disconnect', function() {
        isPaired = false;
        isConnected = false;
        showMessage('Disconnected from server..');
    });
    socket.on('connect_failed', function() {
        isPaired = false;
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
    socket.on('whoareyou', function(data) {
        if(!id){
            id = data;
            showMessage('Connected, id is ' + data);
        }
        if (navigator.geolocation)
            getGeolocation();
        else
           showMessage("Your browser does not support Geolocation");
        socket.emit('iam', {
            'id' : id,
            'geo': geo
        });
    });

    socket.on('IDexpired', function(data) {
        id = data;
        showMessage('Connected, id is ' + data);
        socket.emit('newIDcomfirmed', {
            'id':id,
            'geo':geo
        })
    })

    /**
     * Successfully making a pair, confirm sending files to it?
     * @param  {Object} data A JSON object that contains multiple info.
     */
    socket.on('confirmSend', function(data) {
        gConID = data.connectionID;
        gPartnerID = data.partnerID;
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
     *  Succeeded on making a pair
     */
    socket.on('pairSucceeded', function(data) {
        gConID = data.connectionID;
        gPartnerID = data.partnerID;
        isPaired = true;
        showMessage("Succeeded on making pair with [user:] " + data.partnerID);
    });

    /**
     * Failed making a pair.
     */
    socket.on('pairFailed', function() {
        isPaired = false;
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
        //downloadLink.click();

        if(SLICE){
            var seq = data.seq;
            var maxseq = data.maxseq;
            var fileName = data.fileName;
            initFileMatrix(maxseq);

            console.log(seq + "-" + maxseq);

            var url = data.fileURL;
            url = url.replace(/download/,"file");

            var xhr = new XMLHttpRequest();
            xhr.open('GET',url, true);
            xhr.responseType = 'blob';
            xhr.onload = function(){
                regroupSlicedFile(xhr.response,seq,maxseq, fileName);
            }
            xhr.send();
  
        }
        else{
            drawImageOnCanvas(data.fileURL,0,0);
        }
    });

    /**
     * The uploading somehow failed..
     */
    socket.on('uploadFailed', function(data) {
        showMessage("Uploading failed...");
    });

    socket.on('imageCoords', function(data) {
        drawImageOnCanvas(fileMatrix[0].toURL(),data.X,data.Y);
    });
    
    /**
     * Try to get geolocation on initialization
     *
     */
    

    sendButton.onclick = function() {
        pairToSend(socket);
    };

    receiveButton.onclick = function() {
        pairToReceive(socket);
    };

    pairButton.onclick = function() {
        findPair(socket);
    };

    pairSendButton.onclick = function() {
        //pairedSend();
    }

})();
