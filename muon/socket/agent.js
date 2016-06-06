"use strict";
require('sexylog');

class MuonSocketAgent {



  constructor(upstreamChannel, downstreamChannel) {
    this.upstreamChannel = upstreamChannel;
    this.downstreamChannel = downstreamChannel;

    var _outboundFunction = this.outbound;
    var _inboundFunction = this.inbound;

    upstreamChannel.rightConnection().listen(function(message) {
        _outboundFunction(message, downstreamChannel.leftConnection());
    });

    downstreamChannel.leftConnection().listen(function(message) {
        _inboundFunction(message, upstreamChannel.rightConnection());
    });

  }


  outbound(message, downstreamConnection) {
      logger.debug('**** AGENT MESSAGE PASSTHROUGH OUTBOUND');
      downstreamConnection.send(message);
  }

  inbound(message, upstreamConnection) {
      logger.debug('**** AGENT MESSAGE PASSTHROUGH INBOUND');
      upstreamConnection.send(message);
  }



}





module.exports = MuonSocketAgent;
