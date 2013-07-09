/*
 * Define the data models used in this project.
 */

/**
 * Containing all the information of a user.
 */
var UserData = function() {
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
};


/**
 * A data structure that stores users.
 * Expecially for saving users that are waiting to be paired.
 */
var Users = function() {
    /**
     * Storing all the users.
     * 'user/socket id' => UserData
     * @type {Object}
     */
    this._store = {};

    /**
     * Remove the user's data in store.
     * @param  {Number} userID The ID of the user to be removed.
     */
    this.clear = function(userID) {
        delete this._store[userID];

    };

    /**
     * The timeout for making a pair. In milliseconds.
     * @type {Number}
     */
    var TIMEOUT = 10000;

    /**
     *  The largest legal geo distance(Meter) of two users
     *  @type {Number}
     */
    var MAXDISTANCE = 50.0;

    /**
     * Add the user into this store for TIMEOUT milliseconds.
     * After it expires, it will be deleted and the callback will be called.
     * @param  {Object} user       The user to be added.
     * @param  {Function} callback To be called when it expires. The user will be passed.
     */
    this.addTillExpire = function(user, callback) {
        this._store[user.id] = user;

        var theID = user.id;
        var store = this._store;
        setTimeout(function() {
            if (theID in store) {
                var u = store[theID];
                callback(u);
                delete store[theID];
            }
        }, TIMEOUT);
    };

    /**
     * Given a baseUser, find the nearest user.
     * @param  {Object} baseUser The user to be compared.
     * @return {Object}          The nearest user.
     */
    this.pickUpon = function(baseUser) {
	   console.log("[_store:] "+Object.keys(this._store));
        var minDistance = 6378137.0;
        var targetUser = null;
        for(var uid in this._store){
            var distance = this.geoDistance(this._store[uid].geoLatitude, this._store[uid].geoLongitude, baseUser.geoLatitude, baseUser.geoLongitude);
            console.log("[distance User"+baseUser.id+" and "+uid+"] " + distance);
            if(distance < minDistance){
                minDistance = distance;
                targetUser = this._store[uid];
            }
        }
        if(minDistance > MAXDISTANCE)
            targetUser = null;
        return targetUser;

    };
    /**
     * Get the radian of an angle
     * @oaram {Number} d    The angle
     * @return {Number}     The radian
     */
    this.getRad = function(d){
        return d*Math.PI/180.0;
    };

    /**
     * Calculate the distance between two geo locations
     * @param {Number} lat1 The latitude of location 1
     * @param {Number} lng1 The longitude of location 1
     * @param {Number} lat2 The latitude of location 2
     * @param {Number} lng2 The longitude of location 2
     * @return {Number}     The distance between two locations
     */
    this.geoDistance = function(lat1, lng1, lat2, lng2){
        var f = this.getRad((lat1 + lat2)/2);
        var g = this.getRad((lat1 - lat2)/2);
        var l = this.getRad((lng1 - lng2)/2);
        
        var sg = Math.sin(g);
        var sl = Math.sin(l);
        var sf = Math.sin(f);
        
        var s,c,w,r,d,h1,h2;
        var a = 6378137.0;  
        var fl = 1/298.257;
        
        sg = sg*sg;
        sl = sl*sl;
        sf = sf*sf;
        
        s = sg*(1-sl) + (1-sf)*sl;
        c = (1-sg)*(1-sl) + sf*sl;
        

        w = Math.atan(Math.sqrt(s/c));
        r = Math.sqrt(s*c)/w;
        d = 2*w*a;
        h1 = (3*r -1)/2/c;
        h2 = (3*r +1)/2/s;
        
        return d*(1 + fl*(h1*sf*(1-sg) - h2*(1-sf)*sg));
    };

    /**
     * Get all the users' IDs.
     * @return {Object} An array of the ids.
     */
    this.userIDs = function() {
        return Object.keys(this._store);
    };
};


/**
 * Containing the necessary for a paired connection.
 */
var Connection = function() {
    /**
     * The identifier for this connection.
     * @type {Number}
     */
    this.id = null;

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

    /**
     * The status of this connection.
     * Can be:
     *     INIT: just inited
     *     SENDING: sender is sending
     *     RECEIVING: receiver is receiving
     * @type {String}
     */
    this.status = "INIT";
};


/**
 * Storing all connections.
 */
var Pairs = function() {
    /**
     * Increase each time a new connection is established.
     * @type {Number}
     */
    var connectionID = 0;
    this._nextID = function() {
        connectionID++;
        return connectionID;
    };

    /**
     * The data structure that stores all the connections.
     * 'connection ID' => Connection
     * @type {Object}
     */
    this._connections = {};

    /**
     * Get the connection by its id.
     * @param  {Number} conID The ID of the connection to get.
     * @return {Object}       The Connection object.
     */
    this.get = function(conID) {
        return this._connections[conID];
    };

    /**
     * Help speed up the search of connections from users' IDs.
     * 'senderID / receiverID' => its connection id
     * NOTE: not used yet..
     * @type {Object}
     */
    this._indices = {};

    /**
     * Remove the connection relative to this user.
     * @param  {Number}   conID    The ID of the connection.
     * @param  {Number}   userID   The ID of the user who stops the connection. Optional.
     * @param  {Function} callback Will be called if the connection is still valid.
     *                             The other user will be passed in.
     *                             Optional.
     */
    this.clear = function(conID, fromUserID, callback) {
        if (!(conID in this._connections)) {
            return;
        }

        var con = this._connections[conID];
        var sender = con.sender;
        var receiver = con.receiver;

        if (fromUserID) {
            if (fromUserID === sender.id) {
                // from sender, tell receiver
                callback(receiver);
            } else {
                // from receiver, tell sender
                callback(sender);
            }
        }

        delete this._connections[conID];
        delete this._indices[sender.id];
        delete this._indices[receiver.id];
    };

    /**
     * Add a new connection after pairing.
     * @param  {Object} sender   The user that sends files.
     * @param  {Object} receiver The user that receives files.
     * @return {Number}          The connection's id.
     */
    this.add = function(sender, receiver) {
        var conID = this._nextID();

        var con = new Connection();
        con.id = conID;
        con.sender = sender;
        con.receiver = receiver;

        delete this._indices[sender.id];
        delete this._indices[receiver.id];

        this._connections[conID] = con;
        this._indices[sender.id] = conID;
        this._indices[receiver.id] = conID;

        return conID;
    };

    /**
     * A user confirms to share files.
     * @param  {Number} conID  The ID of the connection.
     * @param  {Number} userID The ID of the user that confirms.
     * @return {Boolean}       Whether both users have confirmed.
     */
    this.confirm = function(conID, userID) {
        if (!(conID in this._connections)) {
            return false;
        }

        var con = this._connections[conID];
        var sender = con.sender;
        var receiver = con.receiver;

        if (sender.id === userID) {
            // is the sender
            con.senderConfirmed = true;
        } else {
            // is the receiver
            con.receiverConfirmed = true;
        }

        return con.senderConfirmed && con.receiverConfirmed;
    };

    /**
     * For debugging, get all the ids of the connections.
     * @return {Object} An array of objects.
     */
    this.ids = function() {
        var outputs = [];
        for (var conID in this._connections) {
            var con = this._connections[conID];

            var out = {};
            out.connectionID = conID;
            out.senderID = con.sender.id;
            out.receiverID = con.receiver.id;
            console.log(out.connectionID);
            console.log(out.senderID);
            console.log(out.receiverID);

            outputs.push(out);
        }
        return outputs;
    };
};


// exports
exports.UserData = UserData;
exports.Users = Users;
exports.Connection = Connection;
exports.Pairs = Pairs;
