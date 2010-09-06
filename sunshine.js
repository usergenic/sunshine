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

// Default configuration.

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

// The following operation processes the command-line arguments and
// builds the conf object.  Would be nicer to have an option parser
// library do this kind of stuff more declaratively.

var conf = {
    'host'    : parseOpt( '127.0.0.1', ['-h','--host'     ]           ),
    'port'    : parseOpt(        7272, ['-p','--port'     ], parseInt ),
    'logLevel': parseOpt(           0, ['-l','--log-level'], parseInt )
};

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
    console.log(this);
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

Sunshine.prototype.respondTo = function(request, response){
    this.logDebug(">>>>>>>>>>>>>");
    this.logDebug("Request:");
    this.logDebug(request);
    this.logDebug("<<<<<<<<<<<<<");
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end();
};

Sunshine.prototype.start = function(){
    var sun = this;
    this.server = http.createServer(function(request, response){
        sun.handleRequest(request, response);
    });
    this.server.listen(this.conf.port, this.conf.host);
    this.logInfo("Listening at "+this.getBaseURL());
};

var sunshine = new Sunshine(conf);

sunshine.start();

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
