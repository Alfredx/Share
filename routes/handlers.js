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
 * 'user id' => 'success callback, timeout callback'
 */
var toSend = {};
/*
 * All users that are trying to receive files.
 * 'user id' => 'success callback, timeout callback'
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

    // IP address
    console.log("socket connected from " + parseAddress(socket) + ':' + parsePort(socket));

    /**
     * User tries to receive files.
     * @param  {Number} receiveID The ID of the user to receive files.
     */
    socket.on('receive', function(receiveID) {
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
            toSend[sendID].emit('send', receiveID);
            socket.emit('receive', sendID);
            delete toSend[sendID];
        } else {
            // fails to pair
            toReceive[receiveID] = socket;
        }
    });

    /**
     * User tries to send files.
     * @param  {Object} data A JSON object that contains brief file info.
     */
    socket.on('send', function(data) {
        var sendID = data.id;
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
            toReceive[receiveID].emit('receive', sendID);
            socket.emit('send', receiveID);
            delete toReceive[receiveID];
        } else {
            // fails to pair
            toSend[sendID] = socket;
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
