/**
 *	all functions and variables in this file is depreciated
 *	but still be left here
 */

var Users = require('./models').Users;

/*
 * All users that are trying to send files.
 */
var toSend = new Users();
/*
 * All users that are trying to receive files.
 */
var toReceive = new Users();


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
    if(geo){
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
    if(geo){
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