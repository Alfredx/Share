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

var selectText = "Tap here to selecet new file";
/**
 *  The image object that displays the file
 *  @type {Object}
 */
 var img = null;
 var URL = null;

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

 var gConID = null;
 var gPartnerID = null;
 var gPartnerName = null;

 var isPaired = false;

var SLICE = false;

var BYTES_PER_CHUNK = 1024*100;

 /**
  * Show if all chunks are received
  */
 var isFileCompleted = true;
 var isFileSent = false;
 var isFileDownloading = false;
 var isSender = false;
 var isReceiver = false;

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
        // outputField.innerHTML = "<ul></ul>";
        // sendButton.disabled = true;
        // selectedFile = null;
        // //clear canvas
        // canvas.width = canvas.width;
        // img = null;
        return;
    }

    output = [];
    for (var idx = 0, size = files.length; idx < size; idx++) {
        f = files[idx];
        if(f['size'] > 204800){
            alert("Please do not choose a file over 200KB");
            return;
        }
        var url = window.URL || window.webkitURL;
        var src = url.createObjectURL(f);
        drawImageOnCanvas(src,null,null);

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

var canvasOnClick = function(event){
    if(event.layerY < canvas.height/8)
        fileField.click();
};

var initCanvas = function(){
    tableField.hidden = true;
    clearInterval(tableInterval);
    canvas.hidden = false;
    canvas.className = "img-polaroid media background";
    canvas.width = windowWidth*0.8;
    canvas.height = windowHeight*0.8;
    canvas.addEventListener("click", canvasOnClick, false);
    writeOnCanvas(selectText,0.5);
};

var writeOnCanvas = function(text, opacity){
    if(!opacity)
        opacity = 1;
    var fillStyle = 'rgba(255,255,255,'+opacity+')';
    context.textAlign = 'center';
    context.fillStyle = fillStyle;
    context.textBaseline = 'top';
    context.font = 'bold 20px sans-serif';
    context.fillText(text,(canvas.width)/2, 0, canvas.width);
    context.textAlign = 'start';
    context.textBaseline = 'alphabetic';
};

/**
 *  Draw the selected file in canvas
 *  @param f {Object} The file just selected
 *  NOTE: only image file can be showed in canvas
 */
var drawImageOnCanvas = function(src,x,y){
    //show in canvas;
    // if(!img){
    //     img = new Image();
    //     img.src = src;
    // }
    // else{
    //     var aa = img.src.split("?");
    //     var bb = src.split("?");
    //     if(aa[1] != bb[1]){
    //         console.log("new Image");
    //         img = new Image();
    //         img.src = src;    
    //     }
    // }
    img = new Image();
    img.src = src;

    img.onload = function(){
        if(canvas.width > canvas.height){
            imgHeight = canvas.height *0.8;
            imgWidth = img.width*(imgHeight/img.height);
        }
        else{
            imgWidth = canvas.width * 0.8;
            imgHeight = img.height*(imgWidth/img.width);
        }
        canvas.width = canvas.width;
        if(x === null && y === null){
            context.drawImage(img,(canvas.width-imgWidth)/2,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
        }
        else if(x+imgWidth > 0){
            context.drawImage(img,x,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
        }
        writeOnCanvas(selectText,0.5);
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
    var imgX = (canvas.width-imgWidth)/2
    var imgY = (canvas.height-imgHeight)/2;
    var isDragging = false;
    var isDraggable = false;
    var canMouseX = 0;
    var canMouseY = 0;

    function checkMouseOnImage(){
        if(canMouseX < imgX || canMouseX > imgX+imgWidth || canMouseY < imgY || canMouseY > imgY+imgHeight)
            isDraggable = false;
        else
            isDraggable = true;
        return isDraggable;
    };

    function isMouseInSlideArea(){
        // if((canMouseX <= 100) || (canMouseX >= canvas.width-100))
        //     return true;
        // else
        //     return false;
        if(!isSender)
            return false;
        var result = (canMouseX>=(canvas.width*2/3));
        return result;
    };

    function isMouseInRejectArea() {
        if(!isReceiver)
            return false;
        var result = (canMouseX<=(canvas.width/4));
        return result;
    };

    function slide() {
        if(imgX < canvas.width){
            setTimeout(function(){
                writeOnCanvas(selectText,0.5);
                imgX += 10;
                canvas.width = canvas.width;
                context.drawImage(img,imgX,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
                sendImageCoords(socket,imgX-canvas.width,(canvas.height-imgHeight)/2);
                slide();
            },50);
        }
        else{
            canvas.removeEventListener("click",canvasOnClick,false);
            socket.emit('slide',{
                'imgX':imgX-canvas.width,
                'connectionID':gConID,
                'senderID':id
            });
        }
    };

    function reject() {
        if(imgX+imgWidth > 0){
            setTimeout(function(){
                imgX -= 40;
                canvas.width = canvas.width;
                context.drawImage(img,imgX,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
                sendImageCoords(socket,canvas.width+imgX,(canvas.height-imgHeight)/2);
                reject();
            },50);
        }
        else{
            socket.emit('reject',{
                'imgX':canvas.width+imgX,
                'connectionID': gConID,
                'senderID':id
            });
            selectText = "Tap here to select new file";
            writeOnCanvas(selectText,0.5);
            canvas.addEventListener("click",canvasOnClick,false);
            img = null;
            isSender = false;
            isReceiver = false;
            downloadLink.href = "javascript:void(0);";
            downloadButton.hidden = true;
        }
    };

    function isImgInCanvas(){
        // if(imgY >= 0 && imgY+imgHeight < canvas.height)
        //     return true;
        // else 
        //     return false;
        //TODO: can I drag up to send an img
        return true;
    };

    function onMouseDown(event){
        canMouseX = parseInt(event.layerX);
        canMouseY = parseInt(event.layerY);
        if(!checkMouseOnImage())
            return;
        imgOffsetX = canMouseX - imgX;
        imgOffsetY = canMouseY - imgY;
        isDragging = true;
    };

    function onMouseUp(event){
        canMouseX = parseInt(event.layerX);
        canMouseY = parseInt(event.layerY);
        if(isMouseInSlideArea() && checkMouseOnImage() && selectedFile)
            slide();
        if(isMouseInRejectArea() && checkMouseOnImage()){
            reject();
            showMessage("You have rejected file from "+gPartnerName);
        }

        isDragging = false;
        isDraggable = false;
    };

    function onMouseOut(event){
        if(isMouseInSlideArea() && checkMouseOnImage() && selectedFile)
            slide();
        if(isMouseInRejectArea() && checkMouseOnImage()){
            reject();
            showMessage("You have rejected file from "+gPartnerName);
        }
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
        if(!isImgInCanvas())
            return;
        if(isDragging){
            canvas.width = canvas.width;
            context.drawImage(img,canMouseX-imgOffsetX,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
            writeOnCanvas(selectText,0.5);
            var okToSend =  !isFileSent;
            if(okToSend){
                pairedSend(socket);
            }
            // if(isReceiver)
            //     sendImageCoords(socket,canvas.width+imgX,(canvas.height-imgHeight)/2);
            // else
            sendImageCoords(socket,canMouseX-imgOffsetX-canvas.width,canMouseY-imgOffsetY);
        }
    };
    
    function onTouchStart(event){
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        if(!checkMouseOnImage())
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
        if(isMouseInSlideArea() && checkMouseOnImage() && selectedFile)
            slide();
        if(isMouseInRejectArea() && checkMouseOnImage()){
            reject();
            showMessage("You have rejected file from "+gPartnerName);
        }
    };

    function onTouchMove(event){
        if(!isDraggable)
            return;
        event.preventDefault();
        var oldX = canMouseX, oldY = canMouseY;
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        imgX += (canMouseX-oldX);
        if(!isImgInCanvas())
            return;
        if(isDragging){
            canvas.width = canvas.width;
            context.drawImage(img,canMouseX-imgOffsetX,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
            writeOnCanvas(selectText,0.5);
            var okToSend = !isFileSent;
            if(okToSend){
                pairedSend(socket);
            }
            // if(isReceiver)
            //     sendImageCoords(socket,canvas.width+imgX,(canvas.height-imgHeight)/2);
            // else
                
            sendImageCoords(socket,canMouseX-imgOffsetX-canvas.width,canMouseY-imgOffsetY);
        }
    };

    function onTouchCancel(event){
        canMouseX = parseInt(event.targetTouches[0].pageX - offsetX);
        canMouseY = parseInt(event.targetTouches[0].pageY - offsetY);
        isDragging = false;
        isDraggable = false;
    }

    canvas.onmousedown = onMouseDown;
    canvas.onmouseup = onMouseUp;
    canvas.onmouseout = onMouseOut;
    canvas.onmousemove = onMouseMove;
    canvas.addEventListener("touchstart", onTouchStart, false);
    canvas.addEventListener("touchmove", onTouchMove, false);
    canvas.addEventListener("touchend", onTouchEnd, false);
    canvas.addEventListener("touchcanvel", onTouchCancel, false);

}

var clearMouseEvent = function() {
    canvas.onmousemove = null;
    canvas.onmouseup = null;
    canvas.onmouseout = null;
    canvas.onmousedown = null;
    // canvas.removeEventListener
    console.log(setMouseEvent().onTouchEnd);
};

var onSlide = function(imgX) {
    if(imgX < (canvas.width-imgWidth)/2){
        setTimeout(function(){
            imgX+=10;
            canvas.width = canvas.width;
            context.drawImage(img,imgX,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
            onSlide(imgX);
        },50);
    }
};

var onReject = function(imgX) {
    if(imgX > (canvas.width-imgWidth)/2){
        setTimeout(function(){
            imgX-=40;
            canvas.width = canvas.width;
            writeOnCanvas(selectText,0.5);
            context.drawImage(img,imgX,(canvas.height-imgHeight)/2,imgWidth,imgHeight);
            onReject(imgX);
        },50);
    }
    else{
        isSender = false;
        isReceiver = false;
        isFileCompleted = true;
        isFileSent = false;
        isFileDownloading = false;
        setMouseEvent();
        writeOnCanvas(selectText,0.5);
        canvas.addEventListener("click",canvasOnClick,false);
    }
};

var sendImageCoords = function(socket,x,y) {
    if(!isFileSent)
        return;
    socket.emit('imageCoords', {
        'sender':id,
        'conID':gConID,
        'X':x,
        'imgWidth':imgWidth
    });
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
    socket.emit('findPair',{
        'id': id,
        'geo':geo
    });
    showMessage("Finding the nearest user for you.. [me]" + id);
 };

var pairedSend = function(socket){
    if(isReceiver)
        return;
    if(isPaired){
        isSender = true;
        isReceiver = false;
        startSending(socket,gConID,id,gPartnerID);
    }
    else{
        showMessage("you don't have a partner yet");
    }
};

var pairTo = function(socket,targetID,targetName) {
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
    socket.emit('pairTo',{
        'id':id,
        'targetID':targetID
    });
    showMessage("Waiting for "+targetName+"\'s response...");
}

/**
 * start sending file
 * @param  {Object} socket     The socket used in socket.io.
 * @param  {Number} conID      The ID of the connection.
 * @param  {Number} senderID   The ID of the sender.
 * @param  {Number} receiverID The ID of the receiver.
 */
var startSending = function(socket, conID, senderID, receiverID) {
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
        
        // showMessage("Uploading now...",'upload');
        socket.emit('startSending', {
            'connectionID': conID,
            'senderID': senderID
        });
    } else if (id === receiverID) {
        // self is the receiver
        showMessage("User " + senderID + " has started sending..",'upload');
    }
};

var onStartSending = function(socket){
    outputField.innerHTML = "<ul></ul>";
    selectedFile = null;
    isFileCompleted = true;
    isFileSent = false;
    isFileDownloading = false;
    isSender = false;
    isReceiver = true;
    canvas.width = canvas.width;
    img = null;
    canvas.removeEventListener("click",canvasOnClick,false);
    selectText = "";
    writeOnCanvas(selectText,0);
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

    var fd = new FormData();
    var date = new Date();
    date = date.toString();
    date = date.replace(/ /g,"_");
    date = date.replace(/:/g,"_");
    fd.append('uploadedFile', selectedFile['handle']);
    fd.append('sender',id);
    fd.append('fileName',date+selectedFile['name']);
    xhr.send(fd);
    isFileSent = true;
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
            //showMessage("Sending... "+seq,'upload');
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
        if(!geo)
            showMessage("Geographic info loaded");
        geo = {
            'latitude': pos.coords.latitude,
            'longitude': pos.coords.longitude,
            'accuracy': pos.coords.accuracy
        };
        
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
                            onFileAllReceived(socket);
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

var onFileAllReceived = function(socket){
    isFileCompleted = true;
    isFileDownloading = false;

    // showMessage("File received",'upload');
    socket.emit('allReceived',{
        'conID':gConID,
        'senderID':gPartnerID
    });
};

var onUploadSuccess = function(socket,seq,maxseq,fileName,url){
    // fileDelegate.href = "javascript:void(0)";
    // fileDelegate.className = "btn btn-inverse btn-large span3";
    downloadButton.hidden = true;
    downloadLink.href = "";
    //showMessage("Receiving file...",'upload');
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
        URL = url;
        img = new Image();
        img.src = url;
        //drawImageOnCanvas(url,0,0);
        downloadLink.href = url.replace(/file/,"download");
        downloadButton.hidden = false;
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
        tableData[id].distance = distance;
        tableData[id].status = status;
        for (var i = 0; i < rows.length; i++) {
            if(rows[i].cells[0].innerHTML == name){
                rows[i].cells[1].innerHTML = distance+'M';
                rows[i].cells[2].innerHTML = status;
            }
        };
        clearTimeout(tableData[id].timer);
        tableData[id].timer = rowTimer(id,name);
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
        cell_distance.innerHTML = distance+'M';
        cell_status.innerHTML = status;
        tableData[id].timer = rowTimer(id,name);
        row.onclick = function(){
            var id_ = id;
            var name_ = name;
            pairTo(socket,id_,name_);
        }
    }
};

var rowTimer = function(id, name){
    var timer = setTimeout(function(){
        for(var i = 1; i < tableField.rows.length; i++){
            if(tableField.rows[i].cells[0].innerHTML == name){
                delete tableData[id];
                tableField.deleteRow(i);
            }
        }
    },10000);
    return timer;
};

var onload = function(socket){
    if (navigator.geolocation)
       getGeolocation(socket);
    else
       showMessage("Your browser does not support Geolocation",'geo');
    getWindowsWidthAndHeight();
    startQueryUsersNearby(socket);
    tableInterval = setInterval(function(){
        startQueryUsersNearby(socket);
    },5000);
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
        onload(socket);
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
        gPartnerName = data.partnerName;
        isPaired = true;
        isFileCompleted = true;
        isFileSent = false;
        showMessage("Succeeded on making pair with " + data.partnerName);
        
        initCanvas();
    });

    /**
     * Failed making a pair.
     */
    socket.on('pairFailed', function() {
        isPaired = false;
        showMessage("Failed making pair. No response.");
    });

    
    /**
     * Both users confirmed, it's time to start sending.
     */
    socket.on('startSending', function(data) {
        onStartSending(socket);
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
        if(SLICE)
            drawImageOnCanvas(fileMatrix[0].toURL(),data.X/data.imgWidth*imgWidth);
        else{
            drawImageOnCanvas(URL,data.X/data.imgWidth*imgWidth);
            console.log(URL);
        }
    });

    socket.on('downloadLink', function(data) {
        downloadLink.href = data;
        downloadButton.hidden = false;
    });

    socket.on('userInArea',function(data){
        queryUsersNearbyCallback(data.id,data.name,data.distance,data.status);
    });
    
    socket.on('slide',function(data){
        onSlide(data.imgX);
    });

    socket.on('reject',function(data){
        showMessage("Your partner "+gPartnerName+" has rejected your file.")
        onReject(data.imgX);
    });

    socket.on('downloadDone', function(data){
        writeOnCanvas(selectText,0.5);
        canvas.addEventListener("click",canvasOnClick,false);
        selectedFile = null;
        isFileCompleted = true;
        isFileSent = false;
        isFileDownloading = false;
        isSender = false;
        isReceiver = false;
        img = null;
        showMessage("Your partner "+gPartnerName+" has accepted your file.")
    });
    

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
        selectText = "Tap here to select new file";
        writeOnCanvas(selectText,0.5);
        canvas.addEventListener("click",canvasOnClick,false);
        isSender = false;
        isReceiver = false;
        socket.emit('downloadDone', {
            'connectionID': gConID,
            'senderID': id
        });
    };


    
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
