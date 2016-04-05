//var enum = require('enum');
var messages = require('./messages.js');



exports.create = function(errorType, err, origMsg, source) {
    logger.trace('errors.create(' + errorType + ', ' + err + ', ' + origMsg + ')');
    var protocol = 'error';
    if (! origMsg) protocol = origMsg.headers.protocol;
    var headers = {
        event_type: 'error.' + errorType,
        origin_id: origMsg.id,
        protocol: protocol
    };
    return messages.createMessage(err, headers, source);
}

exports.isError = function(msg) {
    var isError = false;
    messages.validate(msg);
    if (msg.headers.event_type.split('.')[0] == 'error') {
        isError = true;
    }
    return isError;
}


exports.isException = function(msg) {
    var isException = false;
    messages.validate(msg);
    if (msg.headers.event_type.split('.')[1] == 'exception') {
        isException = true;
    }
    return isException;
}