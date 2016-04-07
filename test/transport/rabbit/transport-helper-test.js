var helper = require('../../../muon/transport/rabbit/transport-helper.js');
var assert = require('assert');
var expect = require('expect.js');



describe("transport helper test", function () {



      after(function() {
            //bi-channel.closeAll();
      });

    it("create handshake request headers", function () {
        var headers = helper.handshakeRequestHeaders("rpc", "listenq", "replyq");
        assert.equal("listenq", headers.server_listen_q);
        assert.equal("replyq", headers.server_reply_q);
        assert.equal("rpc", headers.protocol);
        assert.equal("handshake.initiated", headers.message_type);
    });

    it("create handshake accept headers", function () {
        var headers = helper.handshakeAcceptHeaders();
        assert.equal("handshake.accepted", headers.message_type);
    });

    it("create string from wire message payload", function (done) {

          var amqpMsg = amqpMessage('PING');
          var message = helper.fromWire(amqpMsg);
          console.log('valid message: ');
          console.dir(message);
          assert.equal(message.payload, 'PING');
          assert.equal(message.headers.protocol, 'rpc');
          assert.equal(message.headers.message_type, 'muon');
          done();
    });

    it("create object from wire message payload", function (done) {
          var amqpMsg = amqpMessage({text: 'PING'});
          var message = helper.fromWire(amqpMsg);
          console.log('valid message: ');
          console.dir(message);
          assert.equal(message.payload.text, 'PING');
          done();
    });


});

function amqpMessage(payload) {
    if (typeof payload == 'object') payload = JSON.stringify(payload);
    var amqpMsg = {
        fields: {
               consumerTag: 'amq.ctag-wPIsYXkDgK6pc8Xbj2lKzA',
               deliveryTag: 1,
               redelivered: false,
               exchange: '',
               routingKey: 'api_test_queue' },
        properties: {
               contentType: undefined,
               contentEncoding: undefined,
               headers:  {
                  message_type: 'muon',
                  protocol: "rpc",
                  content_type: 'application/json',
               },
               deliveryMode: 1,
               priority: undefined,
               correlationId: undefined,
               replyTo: undefined,
               expiration: undefined,
               messageId: undefined,
               timestamp: undefined,
               type: undefined,
               userId: undefined,
               appId: undefined,
               clusterId: undefined
        },
        content:  new Buffer(payload)
    }

    return amqpMsg;

}
