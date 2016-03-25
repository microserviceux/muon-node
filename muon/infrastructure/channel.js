var csp = require("js-csp");
require('sexylog');

/**
 * Muon-node bi-directional channel
 *
 * Bi directional channel with two endpoints (connections) named right & left
 * Each endpoint has an inbound and bound unidrectional channel to send arbitrary messages along to each other
 *
 * var bichannel = require('./bi-channel.js');
 * var channel = bichannel.create("cleint-api");
 * client1(channel.left());
 * client2(channel.right());
 *
 */

module.exports.create = function(name) {
    return new Channel(name);
}


function LeftConnection(name, inbound, outbound) {
    name = name + '-left-connection';
    var handler;
    var listener;
    var connectionObject = {
        send: function(msg) {
            //console.log('channel.send() msg=' + JSON.stringify(msg));
            var id = "unknown";
            if (msg.id !== undefined) {
                id = msg.id;
            }
            logger.debug("[***** CSP-CHANNEL *****] " + name + ".send() event.id='" + id + "'");
            csp.putAsync(outbound, msg);
        },
        listen: function(callback) {
            if (handler) throw new Error(name + ': cannot set listener as handler already set');
            listener = callback;
            return csp.go(function*() {
                while(true) {
                    var value = yield csp.take(inbound);
                    var id = "unknown";
                    if (value.id !== undefined) {
                        id = value.id;
                    }
                     logger.debug("[***** CSP-CHANNEL *****] " + name + ".listen() event.id=" + id);
                     logger.trace("[***** CSP-CHANNEL *****] " + name + ".listen() callback=" + JSON.stringify(callback));
                    if (callback) {
                        callback(value);
                    } else {
                        return value;
                    }
                }
            });
        },
        handler: function(h) {
            if (listener) throw new Error('cannot set handler as listener already set');
            if (handler) throw new Error('left handler already set on channel "' + name + '"');
            handler = h;
            handler.downstreamConnection(this);


            return csp.go(function*() {
                while(true) {
                    var value = yield csp.take(inbound);
                    var id = "unknown";
                    if (value.id !== undefined) {
                        id = value.id;
                    }
                    logger.debug("[***** CHANNEL *****] " + name + ".handler() event.id=" + id);
                    if (handler) {
                        try {
                            var result = handler.sendUpstream(value);
                            logger.trace('handler result.id=' + id);
                            handler.otherConnection(name).send(result);
                        } catch(err) {
                            logger.error(name + ': ' + err);
                            var reply = {status: 'error'};
                            handler.otherConnection(name).send(reply);
                        }
                    } else {
                        throw new Error('handler not set');
                    }

                }
            });
        },
        name: function() {
            return name;
        }
    };
    logger.trace('[***** CSP-CHANNEL *****] returning left connection '+ name);
    return connectionObject;
}


function RightConnection(name, inbound, outbound) {
    name = name + '-right-connection'
    var handler;
    var listener;
    var connectionObject = {
        send: function(msg) {
            var id = "unknown";
            if (msg.id !== undefined) {
                id = msg.id;
            }
            logger.debug("[***** CSP-CHANNEL *****] " + name + ".send() event.id=" + id);
           // logger.debug("[***** CHANNEL *****] " + name + " ChannelConnection.send() listener: " + listener);
            csp.putAsync(outbound, msg);
        },
        listen: function(callback) {
            if (handler) throw new Error(name + ': cannot set listener as handler already set');
            listener = callback;
            //logger.trace(name + " ChannelConnection.send() callback: " + callback);
            return csp.go(function*() {
                while(true) {
                    var value = yield csp.take(inbound);
                    var id = "unknown";
                    if (value.id !== undefined) {
                        id = value.id;
                    }
                     logger.debug("[***** CSP-CHANNEL *****] " + name + ".listen() event.id=" + id);
                    if (callback) {
                        callback(value);
                    } else {
                        return value;
                    }

                }
            });
        },
        handler: function(h) {
            if (listener) throw new Error('cannot set handler as listener already set');
            if (handler) throw new Error('right handler already set on channel "' + name + '"');
            handler = h;
            handler.upstreamConnection(this);

            return csp.go(function*() {
                while(true) {
                    var value = yield csp.take(inbound);
                    var id = "unknown";
                    if (value.id !== undefined) {
                        id = value.id;
                    }
                     logger.debug("[***** CSP-CHANNEL *****] " + name + ".handler() event.id=" + id);
                    if (handler) {
                        try {
                            var result = handler.sendDownstream(value);
                            //logger.trace('handler result=' + JSON.stringify(result));
                            handler.otherConnection(name).send(result);
                        } catch(err) {
                            logger.error(name + ': ' + err);
                            var reply = {status: 'error'};
                            logger.error('[***** CSP-CHANNEL *****] ' + name + ' RightConnection error: returning message back upstream');
                            csp.putAsync(outbound, reply);
                        }

                    } else {
                        throw new Error('handler not set');
                    }

                }
            });
        },
        name: function() {
            return name;
        }
    }
    logger.trace('[***** CSP-CHANNEL *****] returning right connection ' + name);
    return connectionObject;
}


function Channel(name) {
    var name = name + '-csp-channel' || "unnamed-csp-channel";
    var inbound = csp.chan();
    var outbound = csp.chan();

    var leftConnection = new LeftConnection(name, inbound, outbound, this);
    var rightConnection = new RightConnection(name, outbound, inbound, this);

    logger.debug('[***** CSP-CHANNEL *****] Created csp bi-channel with name="' + name + '"');
    return {
        leftEndpoint: function(object, ioFunctionName) {
            leftConnection.listen(function(args) {
                    var ioFunction = object[ioFunctionName];
                    var callback = function(reply) {
                        leftConnection.send(reply);
                    }
                    ioFunction(args, callback);
            });
        },
        rightEndpoint: function(object, ioFunctionName) {
               rightConnection.listen(function(args) {
                       var ioFunction = object[ioFunctionName];
                       var callback = function(reply) {
                           rightConnection.send(reply);
                       }
                       ioFunction(args, callback);
               });
           },
        leftHandler: function(handler) {
            leftConnection.handler(handler);
        },
        rightHandler: function(handler) {
            rightConnection.handler(handler);
        },
        leftConnection: function() {
            return leftConnection;
        },
        rightConnection: function() {
            return rightConnection;
        },
        close: function() {
            inbound.close();
            outbound.close();
        }
    }

}







