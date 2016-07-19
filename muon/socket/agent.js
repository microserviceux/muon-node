"use strict";
require('sexylog');
var moment = require('moment');
var messages = require('../domain/messages.js');

var MUON_TIMEOUT = 3000;

/**
  Muon SOcket Kep Alive Agent

  Sends ping messages to other socket host to ensure connection stays up
*/

class MuonSocketAgent {

  constructor(upstreamChannel, downstreamChannel, protocol, offsetMs) {

    try { // GH: had to put try/catch here in order to catch any errors thrown in the trasnport promise
          //TODO write test to find out whythis happens

      //logger.trace('[*** AGENT:CONSTRUCTOR:START ***]');
      //logger.trace('[*** AGENT:CONSTRUCTOR ***] upstream channel: ' + upstreamChannel.name());
      //logger.trace('[*** AGENT:CONSTRUCTOR ***] downstreamChannel channel: ' + downstreamChannel.name());
      //logger.trace('[*** AGENT:CONSTRUCTOR ***] protocol: ' + protocol);

          this.connected = false;
          this.upstreamChannel = upstreamChannel;
          this.downstreamChannel = downstreamChannel;
          this.shutdownInitiated = false;
          if (! offsetMs) offsetMs = 0;
          this.offsetMs = offsetMs;
          this.lastOutboundMessageTimestamp = new Date();
          this.lastInboundMessageTimestamp = new Date();
          this.lastInboundPingTimestamp = new Date();

          var _outboundFunction = this.outbound; //'this' doesnt work in functions below
          var _inboundFunction = this.inbound; //'this' doesnt work in functions below

          upstreamChannel.rightConnection().listen(function(message) {
              this.lastOutboundMessageTimestamp = new Date();
              _outboundFunction(message, downstreamChannel.leftConnection());
          }.bind(this));

          downstreamChannel.leftConnection().listen(function(message) {
              if (message.step == 'keep-alive') {
                this.lastInboundPingTimestamp = new Date();
                logger.debug('[*** MUON:SOCKET:AGENT:INBOUND ***] agent: ping recevied');
                this.connected = true;
              } else {
                logger.trace('[*** MUON:SOCKET:AGENT:INBOUND ***] agent muon message recevied');
                this.connected = true;
                _inboundFunction(message, upstreamChannel.rightConnection());
              }


          }.bind(this));

          this.keepAlive = function() {
              if (timestampSince(this.lastOutboundMessageTimestamp, this.offsetMs) || this.shutdownInitiated) return;
              logger.debug('[*** MUON:SOCKET:AGENT:OUTBOUND ***] sending keep alive ping');
              var ping = messages.pingMessage();
              this.downstreamChannel.leftConnection().send(ping);
            }.bind(this);

            if (this.offsetMs > 0) {
              // keep alive timer
              setInterval(this.keepAlive, this.offsetMs);
              muonTimeout(this);

            }
            //logger.trace('[*** AGENT:CONSTRUCTOR:DONE ***]');


    } catch (err) {
      logger.error(err.stack);
    }

  }

  outbound(message, downstreamConnection) {
      logger.debug('[*** MUON:SOCKET:AGENT:OUTBOUND ***] forwarding message outbound');
      downstreamConnection.send(message);
  }

  inbound(message, upstreamConnection) {
      logger.debug('[*** MUON:SOCKET:AGENT:INBOUND ***] forwarding message inbound');
      if (message.step == 'keep-alive') {
          //discard and carry on
      } else {
          upstreamConnection.send(message);
      }
  }

  destroy() {
    try {
      var shutdownMsg = messages.shutdownMessage();
      //this.upstreamChannel.rightConnection().send(shutdownMsg);
      this.downstreamChannel.leftConnection().send(shutdownMsg);
      //this.upstreamChannel.close();
      //this.downstreamChannel.close();
    } catch(err) {
        logger.warn('problem sending shutdown message on up/down stream channels, they are probably already closed');
        logger.warn(err.stack);
    }
    clearInterval(this.keepAlive);

  }


}


function muonTimeout(agent) {
    var timeout = setTimeout(function() {
      logger.trace('[*** MUON:SOCKET:AGENT:TIMEOUT ***] timestampLongerThan(lastInboundPingTimestamp, MUON_TIMEOUT)=' + timestampLongerThan(agent.lastInboundPingTimestamp, MUON_TIMEOUT));
      logger.trace('[*** MUON:SOCKET:AGENT:TIMEOUT ***] timestampLongerThan(lastInboundMessageTimestamp, MUON_TIMEOUT)=' + timestampLongerThan(agent.lastInboundMessageTimestamp, MUON_TIMEOUT));
      logger.trace('[*** MUON:SOCKET:AGENT:TIMEOUT ***] connected?=' + agent.connected);

      if (timestampLongerThan(agent.lastInboundMessageTimestamp, MUON_TIMEOUT) &&
          timestampLongerThan(agent.lastInboundPingTimestamp, MUON_TIMEOUT) && agent.connected) {
            // send transport shutdown message and close all resources;
            logger.warn('[*** MUON:SOCKET:AGENT:IN/OUTBOUND ***] shutdown initiated due to muon socket timeout of ' + MUON_TIMEOUT + 'ms');
            agent.shutdownInitiated = true;
            agent.destroy();
            logger.warn('[*** MUON:SOCKET:AGENT:IN/OUTBOUND ***] shutdown complete');
      } else {
        muonTimeout(agent);
      }
    }, MUON_TIMEOUT);
    return timeout;

}



function timestampSince(timepstamp, offsetMs) {
  var moment1 = moment(timepstamp).add(offsetMs, 'milliseconds');
  var moment2 = moment(new Date());
  //logger.trace('moment1/moment2: ' + moment1 + "/" + moment2);
  var inTimeWindow = (moment2).isBefore(moment1) ;
  //logger.trace('[*** MUON:SOCKET:AGENT:OUTBOUND ***] message sent since ' + ms + 'ms: ' + inTimeWindow);
  return inTimeWindow;
}


function timestampLongerThan(timepstamp, offsetMs) {
  var moment1 = moment(timepstamp).add(offsetMs, 'milliseconds');
  var moment2 = moment(new Date());
  //logger.trace('moment1/moment2: ' + moment1 + "/" + moment2);
  var outsideTimeWindow = (moment1).isBefore(moment2) ;
  //logger.trace('[*** MUON:SOCKET:AGENT:OUTBOUND ***] message sent since ' + ms + 'ms: ' + inTimeWindow);
  return outsideTimeWindow;
}

module.exports = MuonSocketAgent;

/*



*/
