/*

Sunshine

A REALLY simple JSON Messaging Conduit
By Brendan Baldwin 2010

Start:

    $ node sunshine.js
    Sunshine Server running on http://127.0.0.1:7272/

Connect:

    $ curl http://127.0.0.1:7272/


*/

var http = require('http');

var Sunshine = function(conf){
    this.configure(conf);
    this.initSessions();
};

Sunshine.prototype.appendData = function(request, data){
    if(typeof request.data === "undefined"){
        request.data = "";
    }
    request.data += data;
};

Sunshine.prototype.configure = function(conf){
    // TODO: Extend a blank this.conf object instead of assigning
    // property to parameter.
    this.conf = conf;
};

Sunshine.prototype.getBaseURL = function(){
    var baseURL = "http://" + this.conf.host;
    if(this.conf.port !== 80) baseURL += ":" + this.conf.port;
    return baseURL + "/";
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
    request.data = this.parseRequestData(request);
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end();
};

Sunshine.prototype.respondToGetSession = function(request, response){

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

var sunshine = new Sunshine({
    'host'    : parseOpt( '127.0.0.1', ['-h','--host'     ]           ),
    'port'    : parseOpt(        7272, ['-p','--port'     ], parseInt ),
    'logLevel': parseOpt(           0, ['-l','--log-level'], parseInt )
}).start();

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

/**
http.createServer(function(req, res){

    var count = 0;
    var writeable = true;
    var session_id = req.url;

    req.setEncoding('utf8');

    if(req.method == 'GET'){
        req.on('end', function(){
            sessions[session_id] = res;
            res.writeHead(200, {'Content-Type': 'text/plain'});
            console.log('session '+session_id+' opened.');
        });
        req.socket.on('close', function(){
            delete sessions[session_id];
            console.log('session '+session_id+' closed.');
        });
    }
    else if(sessions[session_id]){
        req.on('data', function(data){
            sessions[session_id].write(data);
        });
        req.on('end', function(){
            sessions[session_id].write("\n");
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end("message sent\n");
        });
    }
    else {
        req.on('end', function(){
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end("no session\n");
        });
    }

}).listen(conf.port, conf.host);

setInterval(function(){
    var sids = [];
    for(var s in sessions){ sids.push(s); }
    console.log(sids);
}, 1000);

console.log('Server running at '+conf.url());

**/
