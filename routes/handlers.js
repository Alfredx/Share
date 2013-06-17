/*
 * All the handlers used in xshare.
 */

/**
 * The number used as a socket's id.
 * Also represents how many sockets have been used.
 * @type {Number}
 */
var socketID = 0;

/*
 * All users that are trying to send files.
 * 'user/socket id' => {
 *     'socket': socket,
 *     'ip': ip address,
 *     'port': port,
 *     'geo': geolocation,
 *     'fileName': fileName,
 *     'fileSize': fileSize
 * }
 */
var toSend = {};

/*
 * All users that are trying to receive files.
 * 'user/socket id' => {
 *     'socket': socket,
 *     'ip': ip address,
 *     'port': port,
 *     'geo': geolocation
 * }
 */
var toReceive = {};


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
 * Init the socket.
 * @param  {Object} socket The socket to init.
 */
var initSocket = function(socket) {
    // assign id for this connection
    socketID++;
    socket.emit('set_id', socketID);

    /**
     * Remove relative data in toSend and toReceive dictionary when disconnected.
     */
    socket.on('disconnect', (function(theID) {
        // save this socket's id for the referrence when disconnected
        return function() {
            delete toSend[theID];
            delete toReceive[theID];
            console.log('Socket disconnected.. [ID] ' + theID);
        };
    })(socketID));

    /**
     * User tries to receive files.
     * @param  {Number} receiveID The ID of the user to receive files.
     */
    socket.on('receive', function(data) {
        var receiveID = data.id;
        // TODO: geo-location is not used currently.
        var geolocation = data.geo;

        delete toSend[receiveID];
        delete toReceive[receiveID];

        var sendID = null;
        for (var uid in toSend) {
            // just pick one...
            sendID = uid;
            break;
        }

        if (sendID) {
            // successfully finds someone to pair
            var partner = toSend[sendID].socket;
            var fileName = toSend[sendID].fileName;
            var fileSize = toSend[sendID].fileSize;

            partner.emit('send', {
                'partnerID': receiveID,
                'fileName': fileName,
                'fileSize': fileSize
            });
            socket.emit('receive', {
                'partnerID': sendID,
                'fileName': fileName,
                'fileSize': fileSize
            });
            delete toSend[sendID];
        } else {
            // fails to pair
            var obj = {};
            obj.socket = socket;
            obj.ip = parseAddress(socket);
            obj.port = parsePort(socket);
            // TODO: also save geolocation data

            toReceive[receiveID] = obj;
            // TODO: also add timeout control
        }
    });

    /**
     * User tries to send files.
     * @param  {Object} data A JSON object that contains brief file info.
     */
    socket.on('send', function(data) {
        var sendID = data.id;
        var geolocation = data.geo;
        /**
         * A JSON object that contains name, type, size, lastModifiedDate
         * @type {Object}
         */
        var fileInfo = data.fileInfo;

        delete toSend[sendID];
        delete toReceive[sendID];

        var receiveID = null;
        for (var uid in toReceive) {
            // just pick one...
            receiveID = uid;
            break;
        }

        if (receiveID) {
            // successfully finds someone to pair
            var partner = toReceive[receiveID].socket;
            partner.emit('receive', {
                'partnerID': sendID,
                'fileName': fileInfo.name,
                'fileSize': fileInfo.size
            });
            socket.emit('send', {
                'partnerID': receiveID,
                'fileName': fileInfo.name,
                'fileSize': fileInfo.size
            });
            delete toReceive[receiveID];
        } else {
            // fails to pair
            var obj = {};
            obj.socket = socket;
            obj.ip = parseAddress(socket);
            obj.port = parsePort(socket);
            obj.fileName = fileInfo.name;
            obj.fileSize = fileInfo.size;
            // TODO: also add geolocation data

            toSend[sendID] = obj;
            // TODO: add timeout control
        }
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
