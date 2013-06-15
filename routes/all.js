
/*
 * GET home page.
 */


exports.index = function(req, res){
    var ctx = {
        title: 'Send or Receive'
    };
    res.render('send', ctx);
};

/**
 * A user tried to connect. Only when another user near him/her
 * is also trying to connect will they become a pair.
 */
exports.connect = function(req, res) {
    var action = req.body.action;
    if (!action) {
        res.send(400, "Need to specify action in post data");
        return;
    }

    res.send(200, "Try to connect, for: " + action);
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
