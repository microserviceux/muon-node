var Joi = require('joi');
var uuid = require('node-uuid');
require('sexylog');
var url = require("url");


var schema = Joi.object().keys({
   id: Joi.string().guid().required(),
   created: Joi.date().timestamp('javascript'),
   payload: Joi.any().required(),
   headers:  Joi.object({
       origin_id: Joi.string().guid().required(),
       event_type: Joi.string().min(3).required(),
       protocol:  Joi.string().min(3).required(),
       target_service: Joi.string().min(3).required(),
       origin_service: Joi.string().min(3).required(),
       server_reply_q:  Joi.string().min(3).optional(),
       server_listen_q: Joi.string().min(3).optional(),
       url: Joi.string().uri().required(),
       channel_op: Joi.string().min(3).required(),
       content_type: Joi.string().min(3).required(),
       content_types: Joi.array().required()
   }).required()
});

exports.validate = function(message) {
    return validateSchema(message);
}

function validateSchema(message) {
    var validatedMessage = Joi.validate(message, schema);
    if (validatedMessage.error) {
        logger.warn('invalid message: \n', message);
        logger.info('invalid joi schema for message! details: ' + JSON.stringify(validatedMessage.error.details));
         logger.error(new Error().stack);
       throw new Error('Error! problem validating rpc message schema: ' + JSON.stringify(validatedMessage.error));
    }
    return message;
}

exports.rpcMessage = function(payload, sourceService, remoteServiceUrl) {

   logger.trace("messages.rpcMessage(payload='" +  payload + "', sourceService='" +  sourceService + "', remoteServiceUrl='" +  remoteServiceUrl + "')");

    var messageid = uuid.v4();

    var serviceRequest = url.parse(remoteServiceUrl, true);

    var headers = {
          event_type: "request.made",
          protocol: "request",
          target_service: serviceRequest.hostname,
          origin_service: sourceService,
          url: remoteServiceUrl
    };

   var message = createMessage(payload, headers);
   return validateSchema(message);

};


exports.fromWire = function(msg) {
    try {
        logger.trace('messages.fromWire('  + JSON.stringify(msg) + ')');
        //console.dir(msg);
        var contents = msg.content.toString();
        logger.trace("messages.fromWire() contents: '" + contents + "'");
        payload = contents;
        try {
            payload = JSON.parse(contents);
        } catch (err) {
            // do nothing, it's not an json object so can't be parsed
        }
        var headers = msg.properties.headers;
        var message = createMessage(payload, headers);
        logger.trace('messages.fromWire() return message='  + JSON.stringify(message) );
       return message;
   } catch (err) {
        logger.error('error converting amqp wire format message to muon event message');
        logger.error(err);
        logger.error(err.stack);
        throw new Error(err);
   }
}


exports.handshakeRequest = function(protocol, sourceService, listenQueue, replyQueue ) {

  var headers = {
     event_type: "handshakeInitiated",
     protocol:"request",
     server_reply_q:replyQueue,
     server_listen_q: listenQueue,
     target_service: '--n/a--',
     origin_service: sourceService,
     url: 'muon://n/a'
    };
   return createMessage(null, headers);

}

exports.handshakeAccept = function() {

  var headers = {
     event_type: "handshakeAccepted",
     protocol:"request",
     target_service: '--n/a--',
     origin_service: '--n/a--',
     url: 'muon://n/a'
    };
   return createMessage(null, headers);

}

function createMessage(payload, headers) {
    logger.trace('createMessage(payload='  + JSON.stringify(payload) + ', headers='  + JSON.stringify(headers) +  ')');
    if (! payload) payload = {};
    if (! headers.channel_op) headers.channel_op = 'normal';
    if (! headers.content_type) headers.content_type = 'application/json';
    if (! headers.content_types) headers.content_types = ['application/json'];
     if (! headers.origin_id) headers.origin_id = uuid.v4();
    //if (! headers.server_reply_q) headers.content_type = '--n/a--';
    //if (! headers.server_listen_q) headers.content_type = '--n/a--';

     var message = {
         id: uuid.v4(),
         created: new Date(),
         payload: payload,
         headers: {
              origin_id: headers.origin_id,
              event_type: headers.event_type,
              protocol: headers.protocol,
              target_service: headers.target_service,
              origin_service: headers.origin_service,
              url: headers.url,
              server_reply_q: headers.server_reply_q,
              server_listen_q: headers.server_listen_q,
              channel_op: headers.channel_op,
              content_type: headers.content_type,
              content_types: headers.content_types
         },
     };
     logger.trace('createMessage() return message='  + JSON.stringify(message));
    return message;
}


