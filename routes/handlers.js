/*
 * All the handlers used in xshare.
 */

/**
 * The number used as a socket's id.
 * Also represents how many sockets have been used.
 * Assigned starting from 1.
 * @type {Number}
 */
var socketID = 0;


/**
 * The timeout for making a pair. In milliseconds.
 * @type {Number}
 */
var TIMEOUT = 1000;


/**
 * Containing all the information of a user.
 */
function UserData() {
    /**
     * The socket id assigned.
     * @type {String}
     */
    this.id = null;
    /**
     * Socket object used in socket.io.
     * @type {Object}
     */
    this.socket = null;

    /**
     * *.*.*.*
     * @type {String}
     */
    this.ip = null;
    /**
     * e.g. 80
     * @type {Number}
     */
    this.port = null;

    /**
     * The longitude of geolocation.
     * @type {Number}
     */
    this.geoLongitude = null;
    /**
     * The latitude of geolocation.
     * @type {Number}
     */
    this.geoLatitude = null;
    /**
     * The accuracy of geolocation.
     * @type {Number}
     */
    this.geoAccuracy = null;

    /**
     * The name of the file user wants to send.
     * Or null if user just want to receive.
     * @type {String}
     */
    this.fileName = null;
    /**
     * The size of the file user wants to send.
     * Or null if user just want to receive.
     * @type {Number}
     */
    this.fileSize = null;
}

/*
 * All users that are trying to send files.
 * 'user/socket id' => UserData
 */
var toSend = {};

/*
 * All users that are trying to receive files.
 * 'user/socket id' => UserData
 */
var toReceive = {};


/**
 * Containing the necessary for a paired connection.
 */
function Connection() {
    /**
     * The user that sends files.
     * @type {Object}
     */
    this.sender = null;
    /**
     * Whether sender has confirmed to send.
     * @type {Boolean}
     */
    this.senderConfirmed = false;
    /**
     * The user that receives files.
     * @type {Object}
     */
    this.receiver = null;
    /**
     * Whether receiver has confirmd to receive.
     * @type {Boolean}
     */
    this.receiverConfirmed = false;
}


/**
 * Managing all the connections that have been paired.
 * @type {Object}
 */
var paired = {
    /**
     * The data structure that stores all the connections.
     * 'senderID' => Connection
     * 'receiverID' => the same Connection
     * @type {Object}
     */
    _connections: {},

    /**
     * Remove the connection relative to this user.
     * @param  {Number} userID The ID of a user in connection.
     */
    clear: function(userID) {
        if (!(userID in this._connections)) {
            return;
        }

        var con = this._connections[userID];
        var sender = con.sender;
        var receiver = con.receiver;
        if (userID === sender.id) {
            // tell receiver
            receiver.socket.emit('betrayedSending', {
                'partnerID': sender.id
            });
        } else {
            // tell sender
            sender.socket.emit('betrayedReceiving', {
                'partnerID': receiver.id
            });
        }

        delete this._connections[sender.id];
        delete this._connections[receiver.id];
    },

    /**
     * Add a new connection after pairing.
     * @param  {Object} sender   The user that sends files.
     * @param  {Object} receiver The user that receives files.
     */
    add: function(sender, receiver) {
        this.clear(sender.id);
        this.clear(receiver.id);

        var con = new Connection();
        con.sender = sender;
        con.receiver = receiver;

        this._connections[sender.id] = con;
        this._connections[receiver.id] = con;
    }
};


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
 * Given a baseUser, find the nearest user in targetUsers.
 * @param  {Object} baseUser    To find the person nearest to this user. UserData type.
 * @param  {Object} targetUsers All available users, 'user/socket id' => UserData.
 * @return {Object}             The nearest user.
 */
var pick = function(baseUser, targetUsers) {
    for (var uid in targetUsers) {
        // TODO: just pick one...
        return targetUsers[uid];
    }
};


/**
 * Called when a user tries to receive files.
 * @param  {Object} socket The  object used in socket.io.
 * @param  {String} receiveID   The id for the user to receive.
 * @param  {Object} geo         Null or A JSON object that contains latitude, longitude and accuracy.
 */
var onPairToReceive = function(socket, receiveID, geo) {
    delete toSend[receiveID];
    delete toReceive[receiveID];

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

    var partner = pick(user, toSend);
    if (partner) {
        // successfully finds someone to pair
        partner.socket.emit('confirmSend', {
            'partnerID': user.id,
            'fileName': partner.fileName,
            'fileSize': partner.fileSize
        });
        socket.emit('confirmReceive', {
            'partnerID': partner.id,
            'fileName': partner.fileName,
            'fileSize': partner.fileSize
        });
        delete toSend[partner.id];

        // add into connection dict
        paired.add(partner, user);
    } else {
        // fails to pair
        toReceive[receiveID] = user;
        setTimeout(function() {
            if (receiveID in toReceive) {
                var u = toReceive[receiveID];
                u.socket.emit('pairFailed');
                delete toReceive[receiveID];
            }
        }, TIMEOUT);
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
    delete toSend[sendID];
    delete toReceive[sendID];

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

    var partner = pick(user, toReceive);
    if (partner) {
        // successfully finds someone to pair
        partner.socket.emit('receive', {
            'partnerID': user.id,
            'fileName': user.fileName,
            'fileSize': user.fileSize
        });
        socket.emit('send', {
            'partnerID': partner.id,
            'fileName': user.fileName,
            'fileSize': user.fileSize
        });
        delete toReceive[partner.id];

        // add into connection dict
        paired.add(user, partner);
    } else {
        // fails to pair
        toSend[sendID] = user;
        setTimeout(function() {
            if (sendID in toSend) {
                var u = toSend[sendID];
                u.socket.emit('pairFailed');
                delete toSend[sendID];
            }
        }, TIMEOUT);
    }
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
    console.log('Socket connected.. [ID] ' + assignedID + ' assigned');

    /**
     * Remove relative data in toSend and toReceive dictionary when disconnected.
     */
    socket.on('disconnect', function() {
        delete toSend[assignedID];
        delete toReceive[assignedID];
        console.log('Socket disconnected.. [ID] ' + assignedID);
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
        var myID = data.myID;
        // var partnerID = data.partnerID;
        paired.clear(myID);
    });

    /**
     * After finding two users, they confirm the connection.
     */
    socket.on('confirm', function(data) {
        // TODO: finish this
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
        title: 'Send or Receive ' + times
    };
    res.render('all', ctx);
};


// TODO: req.body.* => get the post data from request.


/**
 * Handling the send file request.
 * @param  {Object} req
 * @param  {Object} res
 */
exports.send = function(req, res) {
    // TODO: may be used to save the upload file into tmp files
    res.send("Uploaded?!");
};


exports.test = function(req, res) {
    var newline = '<br/>';

    results = "To Send: ";
    results += newline;
    sends = [];
    for (var u1 in toSend) {
        sends.push(u1);
    }
    results += sends.join(', ');
    results += newline;

    results += "To Receive: ";
    results += newline;
    receives = [];
    for (var u2 in toReceive) {
        receives.push(u2);
    }
    results += receives.join(', ');
    results += newline;

    res.send(200, results);
};
