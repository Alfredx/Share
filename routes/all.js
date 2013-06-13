
/*
 * GET home page.
 */

exports.index = function(req, res){
    var ctx = {
        title: 'Send or Receive'
    };
    res.render('send', ctx);
};

exports.connect = function(req, res) {
    res.send("Try to connect");
};

/**
 * Handling the send file request.
 * @param  {Object} req
 * @param  {Object} res
 */
exports.send = function(req, res) {
    res.send("Uploaded?!");
    return;
};
