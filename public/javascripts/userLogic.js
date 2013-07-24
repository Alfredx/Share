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
var setMessageDefaults = function(){
    $._messengerDefaults = {
        extraClasses: 'messenger-fixed messenger-theme-future messenger-on-bottom'
    }
}

var showMessage = function(msg,id){
    if(!id)
        id = 'only-one-message';
    setMessageDefaults();
    $.globalMessenger().post({
        message:msg,
        hideAfter:3,
        id:id
    });
}


var fileField = document.getElementById('sendFile');
var fileDelegate = document.getElementById('fileDelegate');
var outputField = document.getElementById('selectedList');
var tableField = document.getElementById('pairTable');
var sendButton = document.getElementById('sendButton');
var receiveButton = document.getElementById('receiveButton');
var pairButton = document.getElementById('pairButton');
var pairSendButton = document.getElementById('pairSendButton');
var downloadButton = document.getElementById('downloadButton');
var progressBar = document.getElementById('uploadProgress');
var downloadLink = document.getElementById('downloadLink');
var canvasField = document.getElementById('canvas');

var tableInterval = null;
var tableData = {};

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

 var windowWidth = 400;
 var windowHeight = 400;

/**
 *  Socket for connection
 *  @type {Object}
 */
 var socket;

 var gConID;
 var gPartnerID;

 var isPaired = false;

var SLICE = true;

var BYTES_PER_CHUNK = 1024*100;

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
        properties = ['name', 'type', 'size'];
        for (var i = 0, s = properties.length; i < s; i++) {
            var prop = properties[i];
            selectedFile[prop] = f[prop];
        }
        selectedFile['size'] = sh.sizeToString(selectedFile['size']);

        results = "";
        // for (var k in f) {
        for (var k in selectedFile) {
            results += (k + " : " + selectedFile[k]);
            results += "<br/>";
        }
        output.push('<li>' + results + '</li>');

        // save the File instance, it will be used later in XHR2
        selectedFile['handle'] = f;
    }
    outputField.innerHTML = '<ul>' + output.join('') + "</ul>";
    sendButton.disabled = false;
    isFileCompleted = true;
    isFileSent = false;
    isFileDownloading = false;

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
        imgWidth = windowWidth/1.2;
        if(imgWidth > 400)
            imgWidth = 400;
        imgHeight = img.height*(imgWidth/img.width);
        // context.clearRect(0,0,canvas.width,canvas.height);
        if(canvas.height != imgHeight || canvas.width != imgWidth){
            canvas.height = imgHeight;
            canvas.width = imgWidth*1.2;
        }
        else{
            canvas.width = canvas.width;
        }
        if(x+imgWidth > 0){
            context.drawImage(img,x,y,imgWidth,imgHeight);
        }
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
            // context.drawImage(img,canMouseX-imgOffsetX,canMouseY-imgOffsetY,imgWidth,imgHeight);
            context.drawImage(img,canMouseX-imgOffsetX,0,imgWidth,imgHeight);
            var okToSend = isMouseInSendArea() && !isFileSent;
            if(okToSend){
                pairedSend(socket);
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
        event.preventDefault();
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
            context.drawImage(img,canMouseX-imgOffsetX,0,imgWidth,imgHeight);
            var okToSend = isMouseInSendArea() && !isFileSent;
            if(okToSend){
                pairedSend(socket);
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
        getGeolocation(socket);
    }
    else{
       showMessage("Your browser does not support Geolocation",'geo');
       return;
    }
    console.log(geo);
    socket.emit('findPair',{
        'id': id,
        'geo':geo
    });
    showMessage("Finding the nearest user for you.. [me]" + id);
 };

var pairedSend = function(socket){
    if(isPaired){
        onStartSending(socket,gConID,id,gPartnerID);
    }
    else{
        showMessage("you don't have a partner yet");
    }

}

/**
 * start sending file
 * @param  {Object} socket     The socket used in socket.io.
 * @param  {Number} conID      The ID of the connection.
 * @param  {Number} senderID   The ID of the sender.
 * @param  {Number} receiverID The ID of the receiver.
 */
var onStartSending = function(socket, conID, senderID, receiverID) {
    if(!selectedFile)
        return;
    if (id === senderID) {
        // self is the sender
        if(SLICE){
            sliceAndSend(conID);
        }
        else{
            sendAsOneFile(socket, conID);
        }
        
        showMessage("Uploading now...",'upload');
    } else if (id === receiverID) {
        // self is the receiver
        showMessage("User " + senderID + " has started sending..",'upload');
    }
};


var sendAsOneFile = function(socket, conID){
    //send files wrapped in a FormData using XHR2
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload?connectionID=' + conID, true);
    xhr.onload = function(e) {
        progressBar.hidden = true;
        if (this.status === 200) {
            showMessage("Uploading finished.",'upload');
        } else {
            showMessage("Error uploading?!",'upload');
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

    var date = new Date();
    date = date.toString();
    date = date.replace(/ /g,"_");
    date = date.replace(/:/g,"_");

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
        fd.append('fileName',date+selectedFile['name']);

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
            showMessage("Sending... "+seq,'upload');
        } else {
            showMessage("Error uploading?!",'upload');
            console.log("ERROR uploading?");
        }
    };

    xhr.send(chunk);
};

/**
 * Init and save the geolocation data.
 */
var getGeolocation = function(socket) {
    var onSuccess = function(pos) {
        geo = {
            'latitude': pos.coords.latitude,
            'longitude': pos.coords.longitude,
            'accuracy': pos.coords.accuracy
        };
        // alert(geo.latitude +" " + geo.longitude + " "+ geo.accuracy);
        socket.emit('geoLocationUpdate', {
            'id':id,
            'geo':geo
        });
    };
    var onError = function(err) {
        var errors = {
            1: "Authorization fails",           // permission denied
            2: "Can't detect your location",    // position unavailable
            3: "Connection timeout"             // timeout
        };
        showMessage("Error retrieving GEO-LOCATION: " + errors[err.code],'geo');
    };
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true
    });
};

var getWindowsWidthAndHeight = function(){
    if (self.innerHeight) { // all except Explorer    
        if (document.documentElement.clientWidth) {
            windowWidth = document.documentElement.clientWidth;
        } else {
            windowWidth = self.innerWidth;
        }
        windowHeight = self.innerHeight;
    } else {
        if (document.documentElement && document.documentElement.clientHeight) { // Explorer 6 Strict Mode    
            windowWidth = document.documentElement.clientWidth;
            windowHeight = document.documentElement.clientHeight;
        } else {
            if (document.body) { // other Explorers    
                windowWidth = document.body.clientWidth;
                windowHeight = document.body.clientHeight;
            }
        }
    }
}

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

var writeNextChunk = function(filewriter,maxseq) {
    filewriter.seek(filewriter.length);
    filewriter.write(fileMatrix[currentChunk+1]);
    currentChunk++;
}

var regroupSlicedFile = function(responseBlob, seq, maxseq, fileName, socket){
    window.requestFileSystem(TEMPORARY, 5*1024*1024, function(fs){
        fs.root.getFile(fileName, {create:true},function(fileEntry){
            fileEntry.createWriter(function(writer){
                writer.onwriteend = function(){
                    if(fileMatrix[0]){
                        if(currentChunk == maxseq){
                            isFileCompleted = true;
                            isFileDownloading = false;
                            fileDelegate.href = "javascript:sendFile.click();";
                            showMessage("File received",'upload');
                            socket.emit('allReceived',{
                                'conID':gConID,
                                'senderID':gPartnerID
                            });
                            return;
                        }
                        if(fileMatrix[currentChunk+1]){
                            if(writer.readyState == 1){
                                setTimeout(function(){
                                    if(writer.readyState == 1){
                                        setTimeout(function(){
                                            writeNextChunk(writer,maxseq);
                                        },500);
                                    }
                                    writeNextChunk(writer,maxseq);
                                },500)
                            }
                            writeNextChunk(writer,maxseq);
                        }
                    }
                };
                if(seq == 0){
                    writer.write(responseBlob);
                    fileMatrix[0] = fileEntry;
                }
                else{
                    fileMatrix[seq] = responseBlob;
                    if(writer.readyState != 1){
                        writer.onwriteend();
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

var onUploadSuccess = function(socket,seq,maxseq,fileName,url){
    fileDelegate.href = "javascript:void(0)";
    fileDelegate.class = "btn btn-inverse btn-large span3";
    downloadButton.hidden = true;
    downloadLink.href = "";
    showMessage("Receiving file...",'upload');
    //isFileDownloading = true;
    if(SLICE){
        initFileMatrix(maxseq);
        var xhr = new XMLHttpRequest();
        xhr.open('GET',url, true);
        xhr.responseType = 'blob';
        xhr.onload = function(){
            regroupSlicedFile(xhr.response,seq,maxseq, fileName,socket);
        }
        xhr.send();

    }
    else{
        drawImageOnCanvas(data.fileURL,0,0);
    }
};

var startQueryUsersNearby = function(socket){
    socket.emit('usersNearby',{
        'id':id,
        'geo':geo
    });
};

var queryUsersNearbyCallback = function(id,name,distance,status){
    var rows = tableField.rows;
    // for(var i = 1; i < rows.length; i++){
    //     if(rows[i].cells[0].innerHTML == name)
    // }
    if(tableData[id]){
        return;
        clearTimeout(tableData[id].timer);
        tableData[id].timer = setTimeout(function(){
            for(var i = 1; i < tableField.rows.length; i++){
                if(tableField.rows[i].cells[0].innerHTML == name){
                    delete tableData[id];
                    tableField.deleteRow(i);
                }
            }
        },10000);
    }
    else{
        tableData[id] = new Object();
        tableData[id].name = name;
        tableData[id].distance = distance;
        tableData[id].status = status;
        var row = tableField.insertRow(1);
        var cell_name = row.insertCell(0);
        var cell_distance = row.insertCell(1);
        var cell_status = row.insertCell(2);
        cell_name.innerHTML = name;
        cell_distance.innerHTML = distance;
        cell_status.innerHTML = status;
        tableData[id].timer = setTimeout(function(){
            for(var i = 1; i < tableField.rows.length; i++){
                if(tableField.rows[i].cells[0].innerHTML == name){
                    delete tableData[id];
                    tableField.deleteRow(i);
                }
            }
        },10000);
    }
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
        var name = prompt("To receive better experience\nPlease tell us your name:","(your name here)");
        socket.emit('iam', {
            'id' : id,
            'name':name,
            'geo': geo
        });
        if (navigator.geolocation)
           getGeolocation(socket);
        else
           showMessage("Your browser does not support Geolocation",'geo');
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
     *  Succeeded on making a pair
     */
    socket.on('pairSucceeded', function(data) {
        gConID = data.connectionID;
        gPartnerID = data.partnerID;
        isPaired = true;
        isFileCompleted = true;
        isFileSent = false;
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
     * Both users confirmed, it's time to start sending.
     */
    socket.on('startSending', function(data) {
        onStartSending(socket, data.connectionID, data.senderID, data.receiverID);
    });

    /**
     * The sender has finished uploading.
     */
    socket.on('uploadSuccess', function(data) {
        onUploadSuccess(socket,data.seq,data.maxseq,data.fileName,data.fileURL);
    });

    /**
     * The uploading somehow failed..
     */
    socket.on('uploadFailed', function(data) {
        showMessage("Uploading failed...",'upload');
    });

    socket.on('imageCoords', function(data) {
        // drawImageOnCanvas(fileMatrix[0].toURL(),data.X,data.Y);
        drawImageOnCanvas(fileMatrix[0].toURL(),data.X,0);
    });

    socket.on('downloadLink', function(data) {
        downloadLink.href = data;
        downloadButton.hidden = false;
    });

    socket.on('userInArea',function(data){
        queryUsersNearbyCallback(data.id,data.name,data.distance,data.status);
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
        pairedSend(socket);
    };

    downloadButton.onclick = function() {
        if(downloadLink.href === null)
            return;
        downloadLink.click();
    };
    getWindowsWidthAndHeight();
    
    tableInterval = setInterval(function(){
        startQueryUsersNearby(socket);
    },5000);
    /*********************************************************************/
    //depreciate socket message
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
     * After successfully pairing, the partner chose not to share.
     */
    socket.on('betrayed', function(data) {
        showMessage("Your partner (User " + data.partnerID + ") chose not to share files with you..");
    });

    /**
     * The sender has updated its uploading progress.
     */
    socket.on('uploadProgress', function(data) {
        showMessage("Uploading " + data.progress + "%",'upload');
    });
    /************************************************************************/


})();
