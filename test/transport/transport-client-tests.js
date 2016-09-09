
var assert = require('assert');
var expect = require('expect.js');
var sinon = require("sinon")
var transportclient = require("../../muon/transport/transport-client")
var bichannel = require("../../muon/infrastructure/channel")
var messages = require("../../muon/domain/messages")
require('sexylog');

describe("transport-client:", function () {

    this.timeout(8000);

    /**
     * on shutdown virtual channel, propogate the shutdown message to the server
     *
     * on shutdown recieved from transport on the transport channel, send shutdown to all virtual channels.
     *
     * on openChannel, establish a transport channel, return a virtual channel
     * on openChannel to same place (ie, done twice), only return a virtual channel
     *
     */

    it("on openChannel, establish a transport channel, return a virtual channel", function () {
        var transportApi = { openChannel: function (remoteService, protocolName) {} };
        var transport = sinon.mock(transportApi);

        transport.expects("openChannel").once().returns(bichannel.create("transportchannel").leftConnection());

        var transclient = transportclient.create(transportApi)

        var returnedChannel = transclient.openChannel("simples", "rpc")

        assert(returnedChannel)
        transport.verify();
    })

    it("on openChannel to same place (ie, done twice), only return a virtual channel", function () {
        var transportApi = { openChannel: function (remoteService, protocolName) {} };
        var transport = sinon.mock(transportApi);

        transport.expects("openChannel").once().returns(bichannel.create("transportchannel").leftConnection());

        var transclient = transportclient.create(transportApi)

        var returnedChannel = transclient.openChannel("simples", "rpc")
        var returnedChannel2 = transclient.openChannel("simples", "streaming")
        var returnedChannel3 = transclient.openChannel("simples", "fake")
        var returnedChannel4 = transclient.openChannel("simples", "other")

        assert.notEqual(returnedChannel, returnedChannel2)
        transport.verify();
    })

    it("on shutdown virtual channel, propogate the shutdown message to the server", function (done) {
        var transportApi = { openChannel: function (remoteService, protocolName) {} };
        var transport = sinon.mock(transportApi);

        var transportChannel = bichannel.create("transportchannel")
        transportChannel.rightConnection().listen(function(msg) {
            assert.equal(msg.channel_op, "closed")
            done()
        })

        transport.expects("openChannel").once().returns(transportChannel.leftConnection());

        var transclient = transportclient.create(transportApi)

        var returnedChannel = transclient.openChannel("simples", "rpc")

        returnedChannel.close()
    })

    it("on shutdown received from transport on the transport channel, send shutdown to all virtual channels", function (done) {
        var transportApi = { openChannel: function (remoteService, protocolName) {} };
        var transport = sinon.mock(transportApi);

        var transportChannel = bichannel.create("transportchannel")

        transport.expects("openChannel").once().returns(transportChannel.leftConnection());

        var transclient = transportclient.create(transportApi)

        transclient.openChannel("simples", "rpc").listen(function(message) {
            assert.equal(message.channel_op, "closed")
            done()
        })

        transportChannel.rightConnection().send(messages.shutdownMessage())
    })

    it("if no virtual channels open for X seconds, close the transport channel", function (done) {
        var transportApi = { openChannel: function (remoteService, protocolName) {} };
        var transport = sinon.mock(transportApi);

        var transportChannel = bichannel.create("transportchannel")

        transportChannel.rightConnection().listen(function(msg) {
            console.log("Transport got message")
            if (msg.channel_op == "closed") done()
        })

        transport.expects("openChannel").once().returns(transportChannel.leftConnection());

        var transclient = transportclient.create(transportApi)

        var virtchannel = transclient.openChannel("simples", "rpc");
        virtchannel.send(messages.shutdownMessage())
    })
});
