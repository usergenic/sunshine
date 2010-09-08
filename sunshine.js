/*

Sunshine ☀

A REALLY simple JSON Messaging Conduit
By Brendan Baldwin 2010

Start up Sunshine:

    $ node sunshine.js
    Sunshine Server running on http://127.0.0.1:7272/

PUT a channel up:

    $ curl -X PUT http://127.0.0.1:7272/channel_id

GET messages from a channel:

    $ curl http://127.0.0.1:7272/channel_id
    {"hello":"world"}

POST messages to a channel:

    $ curl -d '{"hello":"world"}' http://127.0.0.1:7272/channel_id

DELETE a channel:

    $ curl -X DELETE http://127.0.0.1:7272/channel_id

For more information visit http://brendan.github.com/sunshine.js

*/

var http = require('http');

var Sunshine = function(conf){
    this.configure(conf);
    this.initChannels();
    this.initSessions();
};

Sunshine.prototype.appendData = function(request, data){
    if(typeof request.data === "undefined"){
        request.data = "";
    }
    request.data += data;
};

Sunshine.prototype.authorizeRequest = function(method, channel, request){
    // TODO: Verify that the request contains criteria necessary to
    // perform method on channel.
    return true;
};

Sunshine.prototype.closeChannel = function(channelId){
    if(!this.channels[channelId]){
        this.logError("Unable to close undefined channel: "+channelId);
        return false;
    }

    var channelSessions = this.channelSessions[channelId];
    for(var sessionId in channelSessions){
        this.closeSession(sessionId);
    }
};

Sunshine.prototype.closeSession = function(sessionId){
    var sessions = this.sessions;
    var session = sessions[sessionId];
    if(session){
        session.response.end();
        var channelSessions = this.channelSessions[session.channelId];
        delete channelSessions[sessionId];
        delete sessions[sessionId];
    }
};

Sunshine.prototype.configure = function(conf){
    this.conf = {};
    for(var k in conf){
        var v = conf[k];
        this.conf[k] = v;
    }
};

Sunshine.prototype.deleteChannel = function(channel_id){
    // TODO: Implement me.
    return false;
};

Sunshine.prototype.generateSessionId = function(){
    var sessionId = "";

    for(var i = 0; i < 32; i++){
        sessionId += (Math.random() * 10);
    }

    if(this.sessions[sessionId])
        return this.generateSessionId();

    return sessionId;
};

Sunshine.prototype.getBaseURL = function(){
    var baseURL = "http://" + this.conf.host;
    if(this.conf.port !== 80) baseURL += ":" + this.conf.port;
    return baseURL + "/";
};

Sunshine.prototype.getChannel = function(channelId){
    if(channelId)
        return this.channels[channelId];
};

Sunshine.prototype.handleRequest = function(request, response){
    var sun = this;
    request.setEncoding('utf8');
    request.on('data', function(data){
        sun.appendData(request, data);
    });
    request.on('end', function(){
        sun.respondTo(request, response);
    });
};

Sunshine.prototype.initChannels = function(){
    // TODO: If sessions are open and connected to channels, close their
    // connections before clearing the registry.
    this.channels = {};
    this.channelSessions = {};
};

Sunshine.prototype.initSessions = function(){
    // TODO: If sessions are present, close their connections before
    // clearing the registry.
    this.sessions = {};
};

Sunshine.prototype.log = function(severity, message){
    if(this.conf.logLevel <= severity) console.log(message);
};

Sunshine.prototype.logDebug = function(message){
    this.log(0, message);
};

Sunshine.prototype.logError = function(message){
    this.log(3, message);
};

Sunshine.prototype.logInfo = function(message){
    this.log(1, message);
};

Sunshine.prototype.logWarn = function(message){
    this.log(2, message);
};

Sunshine.prototype.openChannel = function(channelId, definition){
    if(this.channels[channelId]){
        this.logError("Channel already open: "+channelId);
        return false;
    }
    if(!definition)
        definition = {};
    this.channels[channelId] = definition;
    this.channelSessions[channelId] = {};
    return true;
};

Sunshine.prototype.openSession = function(channelId, response){
    var sessionId = this.generateSessionId();
    this.sessions[sessionId] = {
        'channel_id': channelId,
        'response': response
    };
    this.channelSessions[channelId][sessionId] = true;
    return sessionId;
};

Sunshine.prototype.parseFormURLEncoded = function(querystring){
    var data = {};
    var nvpairs = querystring.split(/&/);
    for(var p in nvpairs){
        var nvpair = nvpairs[p].split(/=/);
        if(nvpair.length == 2){
            var n = unescape(nvpair[0]);
            var v = unescape(nvpair[1]);
            data[n] = v;
        }
    }
    return data;
};

Sunshine.prototype.parseJSON = function(json){
    try {
        return JSON.parse(json);
    }
    catch(e) {
        return null;
    }
};

Sunshine.prototype.parseRequestData = function(request){
    if(typeof request.data == 'undefined')
        return null;
    switch(request.headers['content-type']){
    case 'application/json':
        return this.parseJSON(request.data);
    case 'application/x-www-form-urlencoded':
        return this.parseFormURLEncoded(request.data);
    default:
        return null;
    }
};

Sunshine.prototype.respondTo = function(request, response){
    this.logInfo(request.method+' '+request.url);
    request.channelId = request.url;
    request.data = this.parseRequestData(request);
    switch(request.method){
    case "DELETE":
        return this.respondToDELETE(request, response);
    case "HEAD":
        return this.respondToHEAD(request, response);
    case "GET":
        return this.respondToGET(request, response);
    case "POST":
        return this.respondToPOST(request, response);
    case "PUT":
        return this.respondToPUT(request, response);
    default:
        return this.respondWith(response, 405);
    }
};

Sunshine.prototype.respondToDELETE = function(request, response){
    var channel = this.getChannel(request.channelId);

    if(!channel)
        return this.respondWith(response, 404);

    if(!this.authorizeRequest('DELETE', channel, request))
        return this.respondWith(response, 403);

    this.deleteChannel(channel);
    this.respondWith(response, 410);
};

Sunshine.prototype.respondToGET = function(request, response){
    var sun = this;
    var channel = sun.getChannel(request.channelId);

    if(!channel)
        return sun.respondWith(response, 404);

    if(!sun.authorizeRequest('GET', channel, request))
        return sun.respondWith(response, 403);

    var sessionId = sun.openSession(request.channelId, response);

    response.writeHead(200, {'Content-Type': 'application/json-stream'});
    request.socket.on('close', function(){
        sun.closeSession(sessionId);
    });
};

Sunshine.prototype.respondToHEAD = function(request, response){
    var sun = this;
    var channel = sun.getChannel(request.channelId);

    if(!channel)
        return sun.respondWith(response, 404);

    if(!sun.authorizeRequest('GET', channel, request))
        return sun.respondWith(response, 403);

    return sun.respondWith(response, 200);
};

Sunshine.prototype.respondToPOST = function(request, response){
    var sun = this;
    var channel = sun.getChannel(request.channelId);

    if(!channel)
        return sun.respondWith(response, 404);

    if(!sun.authorizeRequest('POST', channel, request))
        return sun.respondWith(response, 403);

    sun.respondWith(response, 201);
    sun.writeToChannel(request.channelId, JSON.stringify(request.data)+"\n");

    return 201;
};

Sunshine.prototype.respondToPUT = function(request, response){
    var sun = this;
    var channel = sun.getChannel(request.channelId);

    if(channel)
        return sun.respondWith(response, 409);

    if(!sun.authorizeRequest('PUT', channel, request))
        return sun.respondWith(response, 403);

    if(sun.openChannel(request.channelId, request.data))
        return sun.respondWith(response, 201);

    return sun.respondWith(response, 500);
};

Sunshine.prototype.respondWith = function(response, status){
    response.writeHead(status, {'Content-Type': 'text/plain', 'Content-Length': '0'});
    response.end();
    return status;
};

Sunshine.prototype.start = function(){
    var sun = this;
    sun.server = http.createServer(function(request, response){
        sun.handleRequest(request, response);
    });
    sun.server.listen(sun.conf.port, sun.conf.host);
    sun.logInfo("Listening at "+sun.getBaseURL());
    return sun;
};

Sunshine.prototype.writeToChannel = function(channelId, data){
    var channelSessions = this.channelSessions[channelId];
    if(channelSessions){
        for(var sessionId in channelSessions){
            this.writeToSession(sessionId, data);
        }
    }
};

Sunshine.prototype.writeToSession = function(sessionId, data){
    var session = this.sessions[sessionId];
    if(session)
        session.response.write(data);
};

var sunshine = new Sunshine({
    'host'    : parseOpt( '127.0.0.1', ['-h','--host'     ]           ),
    'port'    : parseOpt(        7272, ['-p','--port'     ], parseInt ),
    'logLevel': parseOpt(           0, ['-l','--log-level'], parseInt )
}).start();

function h(string){
    return string.
        replace(/&/g,'&amp;').
        replace(/</g,'&lt;').
        replace(/>/g,'&gt;').
        replace(/'/g,'&#39;');
}

function parseOpt(defaultValue, flags, callback){
    for(var f in flags){
        var a = process.argv.indexOf(flags[f]);
        if((a > -1) && (a+1 < process.argv.length)){
            var value = process.argv[a+1];
            if(callback) value = callback(value);
            return value;
        }
    }
    return defaultValue;
}
