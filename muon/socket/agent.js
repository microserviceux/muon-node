"use strict";
require('sexylog');
var moment = require('moment');
var messages = require('../domain/messages.js');

var MUON_TIMEOUT = 1000;

/**
  Muon SOcket Kep Alive Agent

  Sends ping messages to other socket host to ensure connection stays up
*/

class MuonSocketAgent {

  constructor(upstreamChannel, downstreamChannel, protocol, offsetMs) {

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
          // then discard the ping
        } else {
          _inboundFunction(message, upstreamChannel.rightConnection());
        }


    }.bind(this));

    var keepAlive = function() {
        if (timestampSince(this.lastOutboundMessageTimestamp, this.offsetMs) || this.shutdownInitiated) return;
        logger.trace('[*** MUON:SOCKET:AGENT:OUTBOUND ***] sending keep alive ping');
        var ping = messages.muonMessage({}, 'this', 'that', protocol, 'keep-alive');
        this.downstreamChannel.leftConnection().send(ping);
      }.bind(this);

      var muonTimeout = function() {
          if (this.shutdownInitiated) return;
          if (timestampLongerThan(this.lastInboundMessageTimestamp, MUON_TIMEOUT) &&
              timestampLongerThan(this.lastInboundPingTimestamp, MUON_TIMEOUT)) {
                // send transport shutdown message and close all resources;
                logger.warn('[*** MUON:SOCKET:AGENT:IN/OUTBOUND ***] shutdown initiated due to muon socket timeout of ' + MUON_TIMEOUT + 'ms');
                this.shutdownInitiated = true;
                var shutdownMsg = messages.shutdownMessage();
                this.upstreamChannel.rightConnection().send(shutdownMsg);
                this.downstreamChannel.leftConnection().send(shutdownMsg);
                //this.upstreamChannel.close();
                //this.downstreamChannel.close();
                clearInterval(this.keepAlive);
                clearInterval(this.muonTimeout);
                logger.warn('[*** MUON:SOCKET:AGENT:IN/OUTBOUND ***] shutdown complete');
          }
        }.bind(this);


      if (this.offsetMs > 0) {
        // keep alive timer
        setInterval(keepAlive, this.offsetMs);
        setInterval(muonTimeout, MUON_TIMEOUT);

      }

  }

  outbound(message, downstreamConnection) {
      logger.trace('[*** MUON:SOCKET:AGENT:OUTBOUND ***] forwarding message outbound');
      downstreamConnection.send(message);
  }

  inbound(message, upstreamConnection) {
      logger.trace('[*** MUON:SOCKET:AGENT:INBOUND ***] forwarding message inbound');
      if (message.step == 'keep-alive') {
          //discard

      } else {
          upstreamConnection.send(message);
      }

  }

/*
  setLastMessageTimestamp() {
      //console.log('setLastMessageTimestamp()', this);
      this.lastMessageTimestamp = new Date();
      logger.trace('this.lastMessageTimestamp=' + this.lastMessageTimestamp);
  }
*/


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
