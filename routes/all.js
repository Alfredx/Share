
/*
 * GET home page.
 */


exports.index = function(req, res){
    var ctx = {
        title: 'Send or Receive'
    };
    res.render('send', ctx);
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

    var base, target;
    if (action === 'send') {
        base = usersToSend;
        target = usersToReceive;
    } else {
        base = usersToReceive;
        target = usersToSend;
    }

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
    return;
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
    res.send("HELLO ANDRIY");
};
