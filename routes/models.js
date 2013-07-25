/*
 * Define the data models used in this project.
 */
var fs = require('fs');

/**
 * Calculate the distance between two geo locations
 * @param {Number} lat1 The latitude of location 1
 * @param {Number} lng1 The longitude of location 1
 * @param {Number} lat2 The latitude of location 2
 * @param {Number} lng2 The longitude of location 2
 * @return {Number}     The distance between two locations
 */
var geoDistance = function(geo1, geo2){
    var lat1 = geo1.latitude;
    var lng1 = geo1.longitude;
    var lat2 = geo2.latitude;
    var lng2 = geo2.longitude;
    var getRad = function(d){
        return d*Math.PI/180.0;
    };
    var f = getRad((lat1 + lat2)/2);
    var g = getRad((lat1 - lat2)/2);
    var l = getRad((lng1 - lng2)/2);       
    var sg = Math.sin(g);
    var sl = Math.sin(l);
    var sf = Math.sin(f);        
    var s,c,w,r,d,h1,h2;
    var a = 6378137.0;  
    var fl = 1/298.257;        
    sg = sg*sg;        sl = sl*sl;        sf = sf*sf;        
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
 * Containing all the information of a user.
 */
var UserData = function() {
    /**
     * The socket id assigned.
     * @type {String}
     */
    this.id = null;
    this.name = null;
    this.status = 'available';
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

    this.geo = null;

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

    /**
     *  @depreciate
     */
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
    //store targetID for pairTo
    this.couple = {};
    /**
     * Remove the user's data in store.
     * @param  {Number} userID The ID of the user to be removed.
     */
    this.remove = function(userID) {
        delete this._store[userID];

    };

    this.add = function(user){
        this._store[user.id] = user;
    }

    this.get = function(userID){
        return this._store[userID];
    }
    /**
     * The timeout for making a pair. In milliseconds.
     * @type {Number}
     */
    var TIMEOUT = 10000;


    /**
     * Add the user into this store for TIMEOUT milliseconds.
     * After it expires, it will be deleted and the callback will be called.
     * @param  {Object} user       The user to be added.
     * @param  {Function} callback To be called when it expires. The user will be passed.
     */
    this.addTillExpire = function(user, targetID, callback) {
        this._store[user.id] = user;
        this.couple[user.id] = targetID;
        var theID = user.id;
        var store = this._store;
        var coup = this.couple;
        setTimeout(function() {
            if (theID in store) {
                var u = store[theID];
                callback(u);
                delete store[theID];
                delete coup[theID];
            }
        }, TIMEOUT);
    };

    /**
     *  The largest legal geo distance(Meter) of two users
     *  @type {Number}
     */
    var MAXDISTANCE = 50.0;
    /**
     * Given a baseUser, find the nearest user.
     * @param  {Object} baseUser The user to be compared.
     * @return {Object}          The nearest user.
     */
    this.findNearestUser = function(baseUser) {
	   console.log("[_store:] "+Object.keys(this._store));
        var minDistance = 6378137.0;
        var targetUser = null;
        for(var uid in this._store){
            if(baseUser.id == uid)
                continue;
            if(!this._store[uid].geo || !baseUser.geo)
                continue;
            var distance = geoDistance(this._store[uid].geo, baseUser.geo);
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

    this.usersNearby = function(baseUser) {
        var users = {};
        for(var uid in this._store){
            if(baseUser.id == uid)
                continue;
            if(!this._store[uid].geo || !baseUser.geo)
                continue;
            var distance = geoDistance(this._store[uid].geo, baseUser.geo);
            if(distance < MAXDISTANCE){
                users[uid] = this._store[uid];
                users[uid].distance = distance;
            }
        }
        return users;
    }
    

    /**
     * Get all the users' IDs.
     * @return {Object} An array of the ids.
     */
    this.userIDs = function() {
        return Object.keys(this._store);
    };

    var DISCONNECTTIMEOUT = 120000;

    /**
     *  When a user disconnected, this function will be called and return a timer 
     *  to wait for the user reconnecting. If in 2mins he still didn't reconnect,
     *  the user will be deleted, otherwise this timer will be cleared
     *  @param  {Number}    userID
     *  @param  {function}  callback    to handle the deletion of the user
     *  @return {Object}    timer       
     */
    this.disconnectTimer = function(userID, callback) {
        var store = this._store;
        var timer = setTimeout( function(){
            if(userID in store){
                var u = store[userID];
                callback(u);
                delete store[userID];
            }
        },DISCONNECTTIMEOUT);
        return timer;
    }
};

var FileRegrouper = function(id1, id2) {
    this.ids = new Array(2);
    this.ids[0] = id1;
    this.ids[1] = id2;

    this.path = null;

    this.regroup = function(senderID, pathArray) {
        var length = pathArray.length;
        if(!length)
            return null;
        this.path = senderID + "_" +this.ids[0]+"_"+this.ids[1];
        if(pathArray[0].indexOf("\\") != -1)
            this.path = pathArray[0].replace(/\\/,"\\"+this.path);
        else
            this.path = pathArray[0].replace(/\//,"\/"+this.path);


        for (var i = 0; i < length; i++) {
            var data = fs.readFileSync(pathArray[i]);
            fs.appendFileSync(this.path,data);
        };

        return this.path;
    }

}


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
     * The status of this connection.
     * Can be:
     *     INIT: just inited
     *     SENDING: sender is sending
     *     RECEIVING: receiver is receiving
     * @type {String}
     */
    this.status = "INIT";

    /**
     *  Whether this connection is ok to delete
     *  @type {Boolean}
     */
    this.finished = false;

    /**
     *  Max sequence of this connection
     *  @type {Number}
     */
    this.maxseq = null;

    /**
     *  Sequence Matrix, using which to tell all the chunks are sent
     *  @type {Array}
     */
    this.seqArray = null;
    this.pathArray = null;

    this.regrouper = null;
    this.fileName = null;

    /**
     *  To set one sequence number as true, means this chunk is sent
     *  @param  {Number}    seq     the specified sequence number
     */
    this.setArrive = function(seq, path){
        this.seqArray[seq] = true;
        this.pathArray[seq] = path;
    }

    /**
     *  initialize the matrix. all set to false
     *  @param  {Number}    max
     */
    this.newFileUpload = function(max) {
        if(this.maxseq)
            return;
        this.maxseq = max;
        this.seqArray = new Array(this.maxseq);
        this.pathArray = new Array(this.maxseq);
        for (var i = 0; i < this.maxseq; i++) {
            this.seqArray[i] = false;
            this.pathArray[i] = null;
        }; 
        this.regrouper = new FileRegrouper(this.clients[0].id,this.clients[1].id);
    }

    /**
     *  See if all chunks are sent
     *  @return {Boolean}
     */
    this.isFinished = function() {
        for(var i = 0; i < this.maxseq; i++){
            if(!this.seqArray[i])
                return false;
        }
        // this.maxseq = 0;
        return true;
    }

    this.regroup = function(senderID) {
        return this.regrouper.regroup(senderID,this.pathArray);
    }

    /**
     *  @type   {Object}
     */
    this.clients = new Array(2);

    /**
     *  @type   {Boolean}
     */
    this.clientsConfirmed = new Array(2);

    this.setClients = function(user1, user2){
        this.clients[0] = user1;
        this.clients[1] = user2;
        this.clientsConfirmed[0] = false;
        this.clientsConfirmed[1] = false;
        //向旧版兼容
        this.sender = user1;
        this.receiver = user2;
        this.senderConfirmed = false;
        this.receiverConfirmed = false;
    };

    this.getTheOther = function(userID){
        // var legal = this.clients[0] && this.clients[1] && (this.clients[0].id === userID || this.clients[1].id === userID);
        // if(!legal){
        //     console.log("illegal!");
        //     return null;
        // }
        if(this.clients[0].id == userID)    //these are not the same type
            return this.clients[1];
        else
            return this.clients[0];
    };

    this.free = function(){
        this.clients[0].status = 'available';
        this.clients[1].status = 'available';
    };

    /**
     *  depreciate
     */
    this.userConfirmed = function(userID) {
        var legal = this.clients[0].id === userID || this.clients[1].id === userID;
        if(!legal)
            return null;
        if(this.clients[0].id === userID)
            this.clientsConfirmed[0] = true;
        else
            this.clientsConfirmed[1] = true;
        return true;
    }

    this.isBothConfirmed = function() {
        return this.clientsConfirmed[0] && this.clientsConfirmed[1];
    }
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
     * Remove the connection relative to this user.
     * @param  {Number}   conID    The ID of the connection.
     * @param  {Number}   userID   The ID of the user who stops the connection. Optional.
     * @param  {Function} callback Will be called if the connection is still valid.
     *                             The other user will be passed in.
     *                             Optional.
     */
    this.remove = function(conID, fromUserID, callback) {
        if (!(conID in this._connections)) {
            return;
        }

        var con = this._connections[conID];
        var sender = con.sender;
        var receiver = con.receiver;

        if (fromUserID) {
            callback(con.getTheOther(fromUserID));
        }

        con.free();
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
        con.setClients(sender,receiver);

        delete this._indices[sender.id];
        delete this._indices[receiver.id];

        this._connections[conID] = con;
        this._indices[sender.id] = conID;
        this._indices[receiver.id] = conID;

        return conID;
    };

    /**
     *  depreciate
     */
     /**
     * Help speed up the search of connections from users' IDs.
     * 'senderID / receiverID' => its connection id
     * NOTE: not used yet..
     * @type {Object}
     */
    this._indices = {};
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
        con.userConfirmed(userID);
        return con.isBothConfirmed();
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
