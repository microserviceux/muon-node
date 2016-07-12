//var amqp = require('../../../muon/transport/amqp/amqp-api.js');
var RSVP = require('rsvp');
var bichannel = require('../../../muon/infrastructure/channel.js');
var helper = require('./transport-helper.js');
require('sexylog');
var messages = require('../../domain/messages.js');

var errCallback;

exports.connect = function (serviceName, amqpApi, serverStacks, discovery) {

try {
  logger.info("[*** TRANSPORT:SERVER:BOOTSTRAP ***] advertising service '" + serviceName + "' on muon discovery");
  //logger.error('amqpApi=' + JSON.stringify(amqpApi));
  //console.dir(amqpApi);
  discovery.advertiseLocalService({
      identifier: serviceName,
      tags: ["node", serviceName],
      codecs: ["application/json"],
      connectionUrls: [amqpApi.url()]
  });

  logger.debug("[*** TRANSPORT:SERVER:BOOTSTRAP ***] server stack of service '" + serviceName + "' connecting to muon...");
  var serviceQueueName = helper.serviceNegotiationQueueName(serviceName);

  logger.info("[*** TRANSPORT:SERVER:HANDSHAKE ***] muon service '" + serviceName + "' listening for negotiation messages on amqp queue '%s'", serviceQueueName);
  var amqpQueue = amqpApi.inbound(serviceQueueName);
  amqpQueue.listen(function (msg) {
      logger.debug("[*** TRANSPORT:SERVER:HANDSHAKE ***]  received negotiation message.headers=%s", JSON.stringify(msg.headers));
      var serverStackChannel = serverStacks.openChannel(msg.headers.protocol);
      initMuonClientServerSocket(amqpApi, msg.headers.server_listen_q, msg.headers.server_reply_q, serverStackChannel);
      var replyHeaders = helper.handshakeAcceptHeaders();
      amqpApi.outbound(msg.headers.server_reply_q).send({headers: replyHeaders, data: {}});
      logger.info("[*** TRANSPORT:SERVER:HANDSAKE ***]  handshake confirmation sent to queue " + msg.headers.server_reply_q);
  });
} catch (err) {
    logger.error(err);
    //TODO do some shutdown?
    errCallback(err);
}


};

exports.onError = function (callback) {
    errCallback = callback;
};

function initMuonClientServerSocket(amqpApi, listen_queue, send_queue, serverStackChannel) {

    amqpApi.inbound(listen_queue).listen(function (message) {
        logger.debug("[*** TRANSPORT:SERVER:INBOUND ***]  received inbound message: %s", JSON.stringify(message));
        var muonMessage = message.data;
        messages.validate(muonMessage);
        serverStackChannel.send(muonMessage);
        //logger.trace("[*** TRANSPORT:SERVER:INBOUND ***]  inbound muon event sent to server stack channel message.id=%s", message.id);
    });

    serverStackChannel.listen(function (event) {
        logger.debug("[*** TRANSPORT:SERVER:OUTBOUND ***]  handling outbound muon event to queue " + send_queue + ": %s", JSON.stringify(event));
        amqpApi.outbound(send_queue).send({headers: {"content_type": "application/json"}, data: event});
    });

}



// TODO -

/**
 *
 * Track down where best to handle channel_op=closed behaviour. Both server and client should attempt to shutdown channels.
 * in case of catastrophic shutdown of the other side.
 *
 *
 * Attempt to build keep alive as a channel process, as in muonjava, and integrate into the pipeline presented from
 *
 * client and server opening of amqp channels
 *
 *
 *
 *
 */
