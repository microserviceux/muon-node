var pako = require("pako")

module.exports.connectAndZip= function(inbound, outbound) {

    inbound.listen(function(msg) {
        logger.info("Inflating message " + JSON.stringify(msg))
        msg.payload = inflate(msg.payload)
        msg.content_type = "application/json"
        outbound.send(msg)
    })

    outbound.listen(function(msg) {
        logger.info("Deflating message " + JSON.stringify(msg))
        msg.payload = deflate(msg.payload)
        msg.content_type = "application/json+DEFLATE"
        logger.info("Message deflated :" + JSON.stringify(msg))
        inbound.send(msg)
    })
}

function inflate(payload) {
    try {
        return pako.inflate(Uint8Array.from(payload));
    } catch(e) {
        logger.error("Unable to inflate a payload, is it zipped with deflate?", e)
    }
}

function deflate(payload) {
    if (!payload) return payload
    return Array.prototype.slice.call(
        pako.deflate(payload));
}
