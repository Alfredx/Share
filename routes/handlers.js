/*
 * All the handlers used in xshare.
 */


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
        console.log("a socket has connected..");
        socket.on('disconnect', function() {
            // it has disconnected..
            console.log('a socket has disconnected..');
        });
        socket.emit('msg', "HELLO ANDRIY");
    });
};

exports.index = function(req, res){
    var ctx = {
        title: 'Send or Receive'
    };
    res.render('all', ctx);
};


/*
 * All users that are trying to send files.
 * 'user id' => 'success callback, timeout callback'
 */
var usersToSend = {};
/*
 * All users that are trying to receive files.
 * 'user id' => 'success callback, timeout callback'
 */
var usersToReceive = {};


/**
 * A user tried to connect. Only when another user near him/her
 * is also trying to connect will they become a pair.
 */
exports.connect = function(req, res) {
    var action = req.body.action;
    if (action !== 'send' && action !== 'receive') {
        res.send(400, "Need to specify accurate action in post data");
        return;
    }

    randomID = req.body.randomID;
    if (!randomID) {
        res.send(400, "Need to specify the user's id in post data");
        return;
    }

    var base, target;
    if (action === 'send') {
        base = usersToSend;
        target = usersToReceive;
    } else {
        base = usersToReceive;
        target = usersToSend;
    }
    delete base[randomID];
    delete target[randomID];

    for (var u in target) {
        obj = target[u];
        obj.onsuccess(randomID);
        res.send(200, "Connected to user " + u);
        delete target[u];
        return;
    }

    // not dispatched
    base[randomID] = {
        onsuccess: function(another) {
            res.send(200, "Connected to user " + another);
        },
        ontimeout: function() {
            res.send(200, "NOT Connected to anyone");
        }
    };

    // when user terminates the connection, remove corresponding data
    (function(request, id, dict) {
        request.on('close', function() {
            delete dict[id];
        });

    })(req, randomID, base);
};


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
    toSend = [];
    for (var u1 in usersToSend) {
        toSend.push(u1);
    }
    results += toSend.join(', ');
    results += newline;

    results += "To Receive: ";
    results += newline;
    toReceive = [];
    for (var u2 in usersToReceive) {
        toReceive.push(u2);
    }
    results += toReceive.join(', ');
    results += newline;

    res.send(200, results);
};
