
var uuid = require('node-uuid');
var _ = require("underscore");
var signals = require("signals");

//TODO - add prioritisation feature

module.exports = function(serviceIdentifier, discoveryService, tags) {

    module.tags = tags;
    module.discoveryService = discoveryService;
    module.transports = [];
    module.serviceIdentifier = serviceIdentifier;
    module.ready = new signals.Signal();
    module.isReady = false;

    setTimeout(function() {
        module.isReady = true;
        module.ready.dispatch();
    }, 3500);

    function generateDescriptor() {
        return {
            "identifier": module.serviceIdentifier,
            "tags": module.tags,

            "resourceConnections":  _.collect(
                _.filter(module.transports, function(it) {
                    return !!("resource" in it);
                }), function(it) {
                    return it.getUrl();
                }),

            "stream": _.collect(
                _.filter(module.transports, function(it) {
                    return !!("stream" in it);
                }), function(it) {
                    return it.getUrl();
                })
        };
    }

    var scope = {
        onReady: function(callback) {
            if (module.isReady) {
                callback();
            } else {
                module.ready.add(callback);
            }
        },
        addTransport: function (transport) {
            //todo, verify the transport.
            //var transport = module.transports[0];
            transport.setServiceIdentifier(serviceIdentifier);
            module.transports.push(transport);
            module.discoveryService.clearAnnouncements();
            module.discoveryService.announceService(generateDescriptor());

        },
        broadcast: {
            on: function (event, callback) {
                _listenOnBroadcast(event, callback);
            },
            emit: function (eventName, headers, payload) {
                //var transport = module.transports[0];
                _emit({
                    name: eventName,
                    headers: headers,
                    payload: payload
                });
            }
        },
        resource: {
            onQuery: function (resource, doc, callback) {
                _listenOnResource(resource, "get", callback);
            },
            onCommand: function (resource, doc, callback) {
                _listenOnResource(resource, "post", callback);
            },
            query: function (url, callback) {
                _sendAndWaitForReply({
                    url: url,
                    payload: {},
                    method: "get"
                }, callback);
            },
            command: function (url, payload, callback) {
                _sendAndWaitForReply({
                    url: url,
                    payload: payload,
                    method: "post"
                }, callback);
            }
        },
        stream: {
            provideStream: function(streamName, stream) {
                checkReady();
                //TODO, transport discovery
                module.transports[0].stream.provideStream(streamName, stream);
            },
            subscribe: function(streamUri, callback) {
                checkReady();
                //TODO, transport discovery
                module.transports[0].stream.subscribe(streamUri, callback);
            }
        },
        discoverServices: function (callback) {
            checkReady();
            module.discoveryService.discoverServices(callback);
        }
    };

    /*
    These do practically all the same thing?
     */

    function _listenOnBroadcast(event, callback) {
        checkReady();
        var transports = module.transports;

        for(var i=0; i<transports.length; i++) {
            var transport = transports[i];
            transport.broadcast.listenOnBroadcast(event, callback);
        }

    }

    function _emit(payload) {
        checkReady();
        var transports = module.transports;

        for(var i=0; i<transports.length; i++) {
            var transport = transports[i];
            transport.broadcast.emit(payload);
        }
    }

    function _listenOnResource(resource, method, callback) {
        checkReady();
        var transports = module.transports;
        for(var i=0; i<transports.length; i++) {
            var transport = transports[i];
            transport.resource.listenOnResource(resource, method, callback);
        }
    }

    function _sendAndWaitForReply(payload, callback) {
        checkReady();
        //TOD, pick the 'best' transport and only send on that one.
        var transports = module.transports;
        for(var i=0; i<transports.length; i++) {
            var transport = transports[i];
            transport.resource.sendAndWaitForReply(payload, callback);
        }
    }

    function checkReady() {
        if (!module.isReady) {
            logger.error("Muon instance is not yet ready, and cannot be interacted with. Use onReady");
            throw new Error("Muon instance is not yet ready, and cannot be interacted with. Use onReady");
        }
    }


    return scope;


};
