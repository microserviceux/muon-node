var bichannel = require('../../../muon/infrastructure/channel.js');
var client = require('../../../muon/transport/amqp/client.js');
var server = require('../../../muon/transport/amqp/server.js');
var assert = require('assert');
var expect = require('expect.js');
var uuid = require('node-uuid');
var messages = require('../../../muon/domain/messages.js');
var AmqpDiscovery = require("../../../muon/discovery/amqp/discovery");
var amqp = require('../../../muon/transport/amqp/amqp-api.js');


var url = "amqp://muon:microservices@localhost";
var amqpApi;
var discovery;


describe("muon client/server transport test: ", function () {






    this.timeout(15000);

    beforeEach(function () {
        console.log('************************************************************************');
        console.log('***  START: ' + this.title);
        console.log('************************************************************************');
    });

    afterEach(function () {
        console.log('************************************************************************');
        console.log('***  FINSIHED: ' + this.title);
        console.log('************************************************************************');
    });

    before(function (done) {
      discovery = new AmqpDiscovery(url);
      amqp.connect(url).then(function(api) {
          logger.info('****************************** AMQP CONNECTED IN TEST **********************************');
          //console.dir(api);
          amqpApi = api;
          done();
      });
    });

    after(function () {
        //shutdown nicely
    });

    it("client server negotiate handshake and exchange rpc message", function (done) {

        var serverName = 'server1';
        var clientName = 'client1';

        var serverChannel = bichannel.create("server-stacks");
        var mockServerStacks = {
            openChannel: function () {
                return serverChannel.rightConnection();
            }
        };

        serverChannel.leftConnection().listen(function (event) {
            logger.warn('********** client_server-test.js serverChannel.leftConnection().listen() event.id=' + event.id);
            var payload = messages.decode(event.payload);
            assert.equal(payload.body, 'PING');

            logger.warn('********** client_server-test.js serverChannel.leftConnection().listen() reply with PONG');
            var rpcResponseMsg = {
                url: 'rpc://client1/reply',
                body: "PONG",
                content_type: 'text/plain'
            }
            var reply = messages.muonMessage(rpcResponseMsg, clientName, 'client1', 'rpc', "request.made");
            messages.validate(reply);
            serverChannel.leftConnection().send(reply);
        });


        server.connect(serverName, amqpApi, mockServerStacks, discovery);
        // now create a muon client socket to connect to server1:
        console.log('creating muon client..');
        var muonClientChannel = client.connect(serverName, "rpc", amqpApi, discovery);
        muonClientChannel.listen(function (event) {
            console.log('********** client_server-test.js muonClientChannel.listen() event received: ');
            //console.dir(event);
            var responseData = messages.decode(event.payload, 'application/json');
            console.dir(responseData);
            assert.equal(responseData.body, 'PONG');
            done();
        });
        console.log('sending muon event via client..');
        var rpcMsg = {
            url: 'rpc://client1/ping',
            body: "PING",
            content_type: 'text/plain'
        }
        var event = messages.muonMessage(rpcMsg, clientName, 'server1', 'rpc', "request.made");
        muonClientChannel.send(event);

    });

    it("client server negotiate handshake and exchange string message", function (done) {

        var serverName = 'server2';
        var clientName = 'client2';

        var serverChannel = bichannel.create("server-stacks");
        var mockServerStacks = {
            openChannel: function () {
                return serverChannel.rightConnection();
            }
        }

        serverChannel.leftConnection().listen(function (event) {
            logger.warn('********** client_server-test.js serverChannel.leftConnection().listen() event.id=' + event.id);
            var payload = messages.decode(event.payload);
            assert.equal(payload, 'PING');

            logger.warn('********** client_server-test.js serverChannel.leftConnection().listen() reply with PONG');

            var reply = messages.muonMessage('PONG', clientName, 'client1', 'rpc', "request.made");
            messages.validate(reply);
            serverChannel.leftConnection().send(reply);
        });

        server.connect(serverName, amqpApi, mockServerStacks, discovery);
        // now create a muon client socket to connect to server1:
        console.log('creating muon client..');
        var muonClientChannel = client.connect(serverName, "rpc", amqpApi, discovery);
        muonClientChannel.listen(function (event) {
            console.log('********** client_server-test.js muonClientChannel.listen() event received!');
            var responseData = messages.decode(event.payload);
            assert.equal(responseData, 'PONG');
            done();
        });
        console.log('sending muon event via client..');

        var event = messages.muonMessage("PING", clientName, 'server1', 'rpc', "request.made");
        muonClientChannel.send(event);

    });
});
