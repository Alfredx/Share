/*
 * All the handlers used in Share.
 */

var models = require('./models');
var depreciateHandlers = require('./depreciate_handlers');
var path = require("path");
var fs = require("fs");
var url = require("url");
var mime = require("./mime").types;

var UserData = models.UserData;
var Users = models.Users;
var Connection = models.Connection;
var Pairs = models.Pairs;

/**
 *  depreciated variables and handlers
    just undefined here dont know why
 */
var toSend = depreciateHandlers.toSend;
var toReceive = depreciateHandlers.toReceive;
var onPairToReceive = depreciateHandlers.onPairToReceive;
var onPairToSend = depreciateHandlers.onPairToSend;
var onConfirmed = depreciateHandlers.onConfirmed;
var onConfirmFailed = depreciateHandlers.onConfirmFailed;



/**
 * The number used as a socket's id.
 * Also represents how many sockets have been used.
 * Assigned starting from 1.
 * @type {Number}
 */
var socketID = 0;

var toPair = new Users();

var onlineUsers = new Users(); var offlineUsers = new Users();

/**
 * Managing all the connections that have been paired.
 */
var paired = new Pairs();

var disconnectTimers = {};


/**
 * Parse the IP address of a socket.
 * @param  {Object} socket The socket to parse.
 * @return {String}        The address string.
 */
var parseAddress = function(socket) {
    return socket.handshake.address.address;
};


/**
 * Parse the port of a socket.
 * @param  {Object} socket The socket to parse.
 * @return {Number}        The port number.
 */
var parsePort = function(socket) {
    return socket.handshake.address.port;
};




/**
 *  Called when a user wants to find a pair but not to send file
 * @param  {Object} socket The  object used in socket.io.
 * @param  {String} userID   The id for the user to receive.
 * @param  {Object} geo         Null or A JSON object that contains latitude, longitude and accuracy.
 */
var onFindPair = function(socket, userID, geo) {
    // toPair.remove(userID);

    // var user = new UserData();
    // user.id = userID;
    // user.socket = socket;
    // user.ip = parseAddress(socket);
    // user.port = parsePort(socket);
    // if(geo){
    //     user.geoLatitude = geo.latitude;
    //     user.geoLongitude = geo.longitude;
    //     user.geoAccuracy = geo.accuracy;
    // }
    var user = onlineUsers.get(userID);
    if(geo){
        onlineUsers.get(userID).geo = geo;
    }
    var partner = onlineUsers.findNearestUser(user);
    // console.log(user);
    // console.log(partner);
    if (partner) {
        // successfully finds someone to pair, add into connection dict
        var conID = paired.add(user, partner);
        onlineUsers.get(user.id).status = 'busy';
        onlineUsers.get(partner.id).status = 'busy';
        user.socket.emit('pairSucceeded', {
            'connectionID': conID,
            'partnerID': partner.id
        });
        partner.socket.emit('pairSucceeded', {
            'connectionID': conID,
            'partnerID': user.id
        });

        toPair.remove(partner.id);
    } else {
        // fails to pair
        toPair.addTillExpire(user, null, function(u) {
            u.socket.emit('pairFailed');
        });
    }

};

var onPairTo = function(socket, id, targetID){
    var targetUser = toPair.get(targetID);
    var user = onlineUsers.get(id);
    if(targetUser && toPair.couple[targetID] === id){
        var conID = paired.add(user, targetUser);
        user.status = 'busy';
        targetUser.status = 'busy';
        user.socket.emit('pairSucceeded', {
            'connectionID': conID,
            'partnerID': targetID,
            'partnerName':targetUser.name
        });
        targetUser.socket.emit('pairSucceeded', {
            'connectionID': conID,
            'partnerID': id,
            'partnerName':user.name
        });
        toPair.remove(targetID);
    }
    else {
        toPair.addTillExpire(user,targetID, function(u) {
            u.socket.emit('pairFailed');
        })
    }
}


var onNewConnection = function(socket, id, geo, name){
    var user = new UserData();
    user.id = id;
    user.name = name;
    user.socket = socket;
    user.ip = parseAddress(socket);
    user.port = parsePort(socket);
    if(geo){
        user.geo = geo;
    }
    onlineUsers.add(user);
    console.log('User connected.. [ID] ' + id + ' assigned');
};

var offline = function(userID) {
    disconnectTimers[userID] = onlineUsers.disconnectTimer(userID,disconnectCallback);
    offlineUsers.add(onlineUsers.get(userID));
    onlineUsers.remove(userID);
};

var disconnectCallback = function(user){
    // toSend.remove(user.id);
    // toReceive.remove(user.id);
    toPair.remove(user.id);
    offlineUsers.remove(user.id);
    disconnectTimers[user.id] = null;
    //TODO!! tell others this user has disconnected
};

var onUsersNearby = function(socket, id, geo){
    var baseUser = onlineUsers.get(id);
    if(!baseUser)
        return;
    var users = onlineUsers.usersNearby(baseUser);
    for(var uid in users){
        socket.emit('userInArea',{
            'name':users[uid].name,
            'id':users[uid].id,
            'distance':users[uid].distance.toFixed(1),
            'status':users[uid].status
        });
    }
};


/**
 * Init the socket.
 * @param  {Object} socket The socket to init.
 */
var initSocket = function(socket) {
    // assign id for this connection
    var assignedID = ++socketID;
    socket.emit('whoareyou',assignedID);

    socket.on('iam', function(data) {
        var timer = disconnectTimers[assignedID];
        if(timer){
            clearTimeout(timer);
            disconnectTimers[assignedID] = null;
            assignedID = data.id;
            onlineUsers.add(offlineUsers.get(assignedID));
            offlineUsers.remove(assignedID);
            console.log('User reconnected.. [ID] ' + assignedID);
        }
        else{
            socket.emit('IDexpired',assignedID);
            onNewConnection(socket,assignedID,data.geo,data.name);
        }
    });

    socket.on('newIDconfirmed', function(data){
        onNewConnection(socket,data.id,data.geo);
    });

    /**
     * Remove relative data in toSend and toReceive dictionary when disconnected.
     */
    socket.on('disconnect', function() {
        // toSend.remove(assignedID);
        // toReceive.remove(assignedID);
        console.log('User disconnected.. [ID] ' + assignedID);
        offline(assignedID);
    });

    /**
     * Uploading failed, clear this connection.
     */
    socket.on('uploadFailed', function(data) {
        var con = paired.get(data.connectionID);
        con.receiver.socket.emit('uploadFailed', {
        });
        //paired.remove(con.id);
    });

    /**
     *  User tries to find pair
     */
    socket.on('findPair', function(data) {
        onFindPair(socket, data.id, data.geo);
    });

    socket.on('pairTo',function(data) {
        onPairTo(socket, data.id, data.targetID);
    });

    socket.on('startSending', function(data) {
        var conID = data.connectionID;
        var senderID = data.senderID;
        var con = paired.get(conID);
        con.getTheOther(senderID).socket.emit('startSending',null);
    });

    socket.on('imageCoords', function(data) {
        var senderID = data.sender;
        var conID = data.conID;
        var con = paired.get(conID);
        con.getTheOther(senderID).socket.emit('imageCoords', {
                'X':data.X,
                'Y':data.Y
            });
    });

    socket.on('allReceived', function(data) {
        var conID = data.conID;
        var senderID = data.senderID;
        var con = paired.get(conID);
        var downloadURL = con.regroup(senderID);
        downloadURL = '/download?path=' + encodeURIComponent(downloadURL) +
                        '&name=' + encodeURIComponent(con.fileName);
        con.getTheOther(senderID).socket.emit('downloadLink', downloadURL);
    });

    socket.on('usersNearby',function(data){
        var id = data.id;
        var geo = data.geo;
        // console.log("user "+id+" finding users");
        onUsersNearby(socket,id,geo);
    });

    socket.on('geoLocationUpdate',function(data){
        var id = data.id;
        var geo = data.geo;
        var user = onlineUsers.get(id);
        if(user){
            user.geo = geo;
        }
    });

    socket.on('slide',function(data){
        var conID = data.connectionID;
        var senderID = data.senderID;
        var imgX = data.imgX;
        var con = paired.get(conID);
        con.getTheOther(senderID).socket.emit('slide',{
            'imgX':imgX
        });
    });

    socket.on('reject',function(data){
        var conID = data.connectionID;
        var senderID = data.senderID;
        var imgX = data.imgX;
        var con = paired.get(conID);
        con.getTheOther(senderID).socket.emit('reject',{
            'imgX':imgX
        });
    });

    socket.on('downloadDone', function(data){
        var conID = data.connectionID;
        var senderID = data.senderID;
        var con = paired.get(conID);
        con.getTheOther(senderID).socket.emit('downloadDone',null);
    });

    /*********************************************************
     *  depreciated socket message
     */
    /**
     * User tries to pair to receive files.
     */
    socket.on('pairToReceive', function(data) {
        onPairToReceive(socket, data.id, data.geo);
    });

    /**
     * User tries to pair to send files.
     */
    socket.on('pairToSend', function(data) {
        onPairToSend(socket, data.id, data.geo, data.fileInfo);
    });

    /**
     * Pair has been made, but one user disagrees to share file with the other.
     */
    socket.on('confirmFailed', function(data) {
        onConfirmFailed(data.connectionID, data.myID);
    });

    /**
     * After finding two users, they confirm the connection.
     */
    socket.on('confirmed', function(data) {
        onConfirmed(data.connectionID, data.myID);
    });

    /**
     * Uploading progress updated.
     */
    socket.on('uploadProgress', function(data) {
        var con = paired.get(data.connectionID);
        var percent = data.progress;
        con.receiver.socket.emit('uploadProgress', {
            'progress': percent
        });
    });

    socket.on('partnerEcho', function(data){
        var senderID = data.id;
        var conID = data.conID;
        var partnerID = data.partnerID;
    });
    /**********************************************************/
};

/**
 * Called in app.js to initialize and use other functions in this file.
 * @param  {Object} io The socket.io object.
 */
exports.init = function(io) {
    /**
     * When a new connection comes
     * @param  {Object} socket The socket for connection.
     */
    io.sockets.on('connection', function(socket) {
        initSocket(socket);
    });

};


/**
 * Display the default page.
 * @param  {Object} req The Request object.
 * @param  {Object} res The Response object.
 */
exports.index = function(req, res){
    var times = 1;
    // I was trying using session, but it was no longer used.
    if (req.session.counter) {
        times = req.session.counter;
        req.session.counter++;
    } else {
        req.session.counter = 1;
    }

    var ctx = {
        title: ''
    };
    res.render('main', ctx);
};


/**
 * Handling the AJAX request for uploading files to send.
 * @param  {Object} req The Request.
 * @param  {Object} res The Response.
 */
exports.upload = function(req, res) {
    var conID = req.query.connectionID;
    if (!conID) {
        res.send(400, 'Need to specify connection ID');
        return;
    }

    var con = paired.get(conID);

    // var f = req.files.uploadedFile;
    var f = req.files[Object.keys(req.files)[0]];
    var seq = req.body.seq;
    var maxseq = req.body.maxseq;
    var senderID = req.body.sender;
    var fileName = req.body.fileName;
    con.fileName = fileName;
    con.newFileUpload(maxseq);
    con.setArrive(seq,f.path);
    var theOther = con.getTheOther(senderID);

    con.isFinished();

    var url = '/file?path=' + encodeURIComponent(f.path) +
              '&name=' + encodeURIComponent(fileName);

    theOther.socket.emit('uploadSuccess', {
            'fileURL': url,
            'seq': seq,
            'maxseq': maxseq,
            'fileName': fileName
    });

    res.send(200);

    
};


/**
 * Handling the request to download a file.
 * @param  {Object} req The Reuqest.
 * @param  {Object} res The Response.
 */
exports.download = function(req, res) {
    var path = req.query.path;
    var name = req.query.name;
    if (!path || !name) {
        res.send(400, 'Invalid URL params.');
        return;
    }

    // TODO: the default fileName will not be reader in Chinese and other characters.
    res.download(path, name);
};


exports.staticfile = function(req, res) {
    var pathname = req.query.path;
    var realPath = pathname;
    
    var ext = path.extname(realPath);
    ext = ext ? ext.slice(1) : 'unknown';

    fs.exists(realPath,function(exists) {
        if(!exists) {
            res.writeHead(404, {'Content-Type':'text/plain'});
            res.write("This request URL "+ pathname+" was not found on this server");
            res.end();
        }
        else {
            fs.readFile(realPath,"binary",function(err, file) {
                if(err){
                    res.writeHead(500, {'Content-Type':'text/plain'});
                    res.end(err);
                }
                else{
                    var contenType = mime[ext] || "image/jpeg";
                    res.writeHead(200, {'Content-Type': contenType});
                    res.write(file,"binary");
                    res.end();
                }
            });
        }
    });
};


/**
 * The test page displays data in toSend, toReceive and paired.
 */
// exports.test = function(req, res) {
//     var newline = '<br/>';

//     var results = "To Send: ";
//     results += newline;
//     var sends = toSend.userIDs();
//     results += sends.join(', ');
//     results += newline;

//     results += "To Receive: ";
//     results += newline;
//     var receives = toReceive.userIDs();
//     results += receives.join(', ');
//     results += newline;

//     results += "Connections: ";
//     results += newline;
//     var cons = paired.ids();
//     for (var idx in cons) {
//         var c = cons[idx];
//         results += "Connection " + c.connectionID + ": " + c.senderID + " => " + c.receiverID;
//         results += newline;
//     }

//     res.send(200, results);
// };
