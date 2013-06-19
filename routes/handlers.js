/*
 * All the handlers used in xshare.
 */

var models = require('./models');

var UserData = models.UserData;
var Users = models.Users;
var Connection = models.Connection;
var Pairs = models.Pairs;


/**
 * The number used as a socket's id.
 * Also represents how many sockets have been used.
 * Assigned starting from 1.
 * @type {Number}
 */
var socketID = 0;


/*
 * All users that are trying to send files.
 */
var toSend = new Users();
/*
 * All users that are trying to receive files.
 */
var toReceive = new Users();

/**
 * Managing all the connections that have been paired.
 */
var paired = new Pairs();


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
 * Called when a user tries to receive files.
 * @param  {Object} socket The  object used in socket.io.
 * @param  {String} receiveID   The id for the user to receive.
 * @param  {Object} geo         Null or A JSON object that contains latitude, longitude and accuracy.
 */
var onPairToReceive = function(socket, receiveID, geo) {
    toSend.clear(receiveID);
    toReceive.clear(receiveID);

    // TODO: what if the user has connected and waited for sharing's completion.

    var user = new UserData();
    user.id = receiveID;
    user.socket = socket;
    user.ip = parseAddress(socket);
    user.port = parsePort(socket);
    if (geo) {
        user.geoLatitude = geo.latitude;
        user.geoLongitude = geo.longitude;
        user.geoAccuracy = geo.accuracy;
    }

    var partner = toSend.pickUpon(user);
    if (partner) {
        // successfully finds someone to pair, add into connection dict
        var conID = paired.add(partner, user);

        partner.socket.emit('confirmSend', {
            'connectionID': conID,
            'partnerID': user.id,
            'fileName': partner.fileName,
            'fileSize': partner.fileSize
        });
        socket.emit('confirmReceive', {
            'connectionID': conID,
            'partnerID': partner.id,
            'fileName': partner.fileName,
            'fileSize': partner.fileSize
        });

        toSend.clear(partner.id);
    } else {
        // fails to pair
        toReceive.addTillExpire(user, function(u) {
            u.socket.emit('pairFailed');
        });
    }
};


/**
 * Called when a user tries to send files.
 * @param  {Object} socket   The object used in socket.io.
 * @param  {String} sendID   The id for the user to send.
 * @param  {Object} geo      Null or A JSON object that contains latitude, longitude and accuracy.
 * @param  {Object} fileInfo A JSON object that contains name, type, size, lastModifiedDate.
 */
var onPairToSend = function(socket, sendID, geo, fileInfo) {
    toSend.clear(sendID);
    toReceive.clear(sendID);

    var user = new UserData();
    user.id = sendID;
    user.socket = socket;
    user.ip = parseAddress(socket);
    user.port = parsePort(socket);
    user.fileName = fileInfo.name;
    user.fileSize = fileInfo.size;
    if (geo) {
        user.geoLongitude = geo.longitude;
        user.geoLatitude = geo.latitude;
        user.geoAccuracy = geo.accuracy;
    }

    var partner = toReceive.pickUpon(user);
    if (partner) {
        // successfully finds someone to pair, add into connection dict
        var conID = paired.add(user, partner);

        partner.socket.emit('confirmReceive', {
            'connectionID': conID,
            'partnerID': user.id,
            'fileName': user.fileName,
            'fileSize': user.fileSize
        });
        socket.emit('confirmSend', {
            'connectionID': conID,
            'partnerID': partner.id,
            'fileName': user.fileName,
            'fileSize': user.fileSize
        });

        toReceive.clear(partner.id);
    } else {
        // fails to pair
        toSend.addTillExpire(user, function(u) {
            u.socket.emit('pairFailed');
        });
    }
};


/**
 * Pair has been made, but one user disagrees to share file with the other.
 * @param  {Number} conID      The ID of the connection.
 * @param  {Number} fromUserID The ID of the user that disagrees.
 */
var onConfirmFailed = function(conID, fromUserID) {
    paired.clear(conID, fromUserID, function(u) {
        // u is the partner
        u.socket.emit('betrayed', {
            'partnerID': fromUserID
        });
    });
};


/**
 * One use confirmed the connection after the pair being made.
 */
var onConfirmed = function(conID, userID) {
    if (!paired.confirm(conID, userID)) {
        return;
    }

    // both confirmed
    var con = paired.get(conID);
    var sender = con.sender;
    var receiver = con.receiver;

    sender.socket.emit('startSending', {
        'connectionID': conID,
        'senderID': sender.id,
        'receiverID': receiver.id
    });
    receiver.socket.emit('startSending', {
        'connectionID': conID,
        'senderID': sender.id,
        'receiverID': receiver.id
    });
    con.status = "SENDING";
};


/**
 * Init the socket.
 * @param  {Object} socket The socket to init.
 */
var initSocket = function(socket) {
    // assign id for this connection
    socketID++;
    var assignedID = socketID;
    socket.emit('setID', assignedID);
    console.log('New user connected.. [ID] ' + assignedID + ' assigned');

    /**
     * Remove relative data in toSend and toReceive dictionary when disconnected.
     */
    socket.on('disconnect', function() {
        toSend.clear(assignedID);
        toReceive.clear(assignedID);
        console.log('User disconnected.. [ID] ' + assignedID);
    });

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

    /**
     * Uploading has finished, it's time for downloading.
     */
    socket.on('uploadSuccess', function(data) {
        var con = paired.get(data.connectionID);
        con.receiver.socket.emit('uploadSuccess', {
        });
        // TODO:
    });

    /**
     * Uploading failed, clear this connection.
     */
    socket.on('uploadFailed', function(data) {
        var con = paired.get(data.connectionID);
        con.receiver.socket.emit('uploadFailed', {
        });
        // TODO:
    });
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

exports.index = function(req, res){
    var times = 1;
    if (req.session.counter) {
        times = req.session.counter;
        req.session.counter++;
    } else {
        req.session.counter = 1;
    }

    var ctx = {
        title: 'Send or Receive '
    };
    res.render('all', ctx);
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

    var f = req.files.uploadedFile;
    console.log(f);
    // TODO: tell the receiver to download this file.

    res.send(200);
};


exports.test = function(req, res) {
    var newline = '<br/>';

    var results = "To Send: ";
    results += newline;
    var sends = toSend.userIDs();
    results += sends.join(', ');
    results += newline;

    results += "To Receive: ";
    results += newline;
    var receives = toReceive.userIDs();
    results += receives.join(', ');
    results += newline;

    res.send(200, results);
};
