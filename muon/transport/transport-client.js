
var _ = require("underscore")
var uuid = require("node-uuid")
var messages = require("../domain/messages")
var bichannel = require("../infrastructure/channel")
/**
 * Implements the client side of transport socket sharing.
 *
 * This will instantiate a single transport channel per remote service.
 *
 * It then provides multiple logical channels on the API side.
 *
 * It multiplexes left channel messages over the single right transport channel. This requires a server side multiplex
 * at the transport/ ServerStack boundary
 */

module.exports.create = function(transport, infrastructure) {

    /*
     * "channelId (uuid)": {
     *   "virtualChannels": [ 
     *      {
     *        channel_id
     *        channel
     *      }
     *   ]
     * }
     */
    var transportChannels= {}
    var virtualChannels = {}
    /*
     * TODO, handle shutdown message from the transport.
     * shutdown message from the virtual channel, close on the other side and remove from this list
     *
     * logically tie virtual to transport channels. probably in data sturcture?
     * need to track usage of transport channels. if they are not used for a while (ie, no active virtual channels), shut them down.
     */

    function cleanupTransportChannel(transportChannel, msg) {
        var failMessage = msg

        if (msg.step.includes("noserver")) {
            // failMessage =
        }

        logger.debug("Transport channel shutdown, removing virtual channels ... ")
        for (var property in transportChannel.virtualChannels) {
            logger.debug("Checking is we remove " + property)
            if (transportChannel.virtualChannels.hasOwnProperty(property)) {
                logger.debug("Removing virtual channel " + property)
                transportChannel.virtualChannels[property].channel.rightConnection().send(failMessage)
                delete transportChannel.virtualChannels[property]
            }
        }

    }

    function openTransportChannel(remoteServiceName) {
        logger.debug("Opening transport channel to " + remoteServiceName)
        var transportChannel = transport.openChannel(remoteServiceName, "shared-channel")
        transportChannel.virtualChannels = {}
        transportChannels[remoteServiceName] = transportChannel
        transportChannel.listen(function(msg) {
            logger.trace("Received message from transport " + JSON.stringify(msg))
            if (msg.channel_op == "closed") {
                cleanupTransportChannel(transportChannel, msg)
                return
            }
            var sharedChannelMessage = messages.decode(msg.payload)
            logger.info("Received shared channel message from transport " + JSON.stringify({
                    channelId: sharedChannelMessage.channelId,
                    protocol: sharedChannelMessage.message.protocol,
                    shared_channel_op: msg.channel_op,
                    channel_op: sharedChannelMessage.message.channel_op,
                    step: sharedChannelMessage.message.step
                }))
            var virtualChannel = virtualChannels[sharedChannelMessage.channelId]
            var wrappedMuonMsg = sharedChannelMessage.message
            if (!virtualChannel) {
                logger.error("Received message from server for which no virtual channel [" + sharedChannelMessage.channelId + "] could be found in local channel list. This is not expected :" + JSON.stringify(wrappedMuonMsg))
                return;
            }
            virtualChannel.channel.rightConnection().send(wrappedMuonMsg);
        })

        return transportChannel
    }

    function cleanVirtualChannel(virtualChannel, transportChannel, remoteServiceName) {
        var virtChannel = virtualChannels[virtualChannel.channel_id]
        if (virtChannel) {
            delete transportChannel.virtualChannels[virtualChannel.channel_id]
            delete virtualChannels[virtualChannel.channel_id]
        }
        if (Object.keys(transportChannel.virtualChannels).length == 0) {
            logger.debug("Transport channel " + transportChannel.name() + " will shutdown, no more virtual channels are routing over it")
            transportChannel.send(messages.shutdownMessage())
            delete transportChannels[remoteServiceName]
        }
    }

    function openVirtualChannel(transportChannel, remoteServiceName) {
        var virtualChannel = {
            channel_id:uuid.v4().toString(),
            channel: null,
            transportChannel: transportChannel
        }

        virtualChannels[virtualChannel.channel_id] = virtualChannel
        transportChannel.virtualChannels[virtualChannel.channel_id] = virtualChannel

        logger.debug("Creating bichannel for virtual channel connection")
        //generate the client side multiplexer
        virtualChannel.channel = bichannel.create("virtual-channel-" + virtualChannel.channel_id + "-" + remoteServiceName)
        virtualChannel.channel.rightConnection().listen(function(message) {
            logger.debug("Sending shared-channel message on transportchannel " + transportChannel + ":::" + JSON.stringify(message))
            message.target_service = remoteServiceName
            message.origin_service = infrastructure.config.serviceName
            if (message.channel_op == "closed") {
                cleanVirtualChannel(virtualChannel, transportChannel, remoteServiceName)
            }
            var sharedChannelMessage = {
                channelId: virtualChannel.channel_id,
                message: message
            }

            var muonMsg = messages.muonMessage(sharedChannelMessage, message.origin_service, remoteServiceName, "shared-channel", "message")

            transportChannel.send(muonMsg)
        })

        return virtualChannel
    }

    function virtualChannel(remoteServiceName, protocolName) {

        logger.debug("Opening virtual channel to " + remoteServiceName)

        var transportChannel = transportChannels[remoteServiceName]
        if (transportChannel == null) {
            transportChannel = openTransportChannel(remoteServiceName)
        }

        var virtualChannel = openVirtualChannel(transportChannel, remoteServiceName)

        return virtualChannel.channel.leftConnection();
    }

    function transportChannel(remoteServiceName, protocolName) {
        return transport.openChannel(remoteServiceName, protocolName)
    }

    var transportApi = {
        openChannel: function (remoteServiceName, protocolName) {
            logger.debug("Open transclient channel " + remoteServiceName)
            // var remoteService = infrastructure.discovery.find(remoteServiceName)
            var supportsSharedChannels = true
            // if (remoteService && _.contains(remoteService.capabilities, "shared-channel")) {
            //     logger.debug("Opening shared-channel connection to " + remoteServiceName)
            //     supportsSharedChannels = true
            // }

            if (supportsSharedChannels) {
                logger.debug("Remote supports shared-channel, generating a virtual channel")
                return virtualChannel(remoteServiceName, protocolName)
            } else {
                logger.debug("No rmeote support for shared-channel, returning transport channel directly")
                return transportChannel(remoteServiceName, protocolName)
            }
        },
        onError: function (cb) {
            return transport.onError(cb)
        },
        shutdown: function() {
            return transport.shutdown()
        }
    }

    return transportApi;
}
