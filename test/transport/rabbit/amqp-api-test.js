var amqpApi = require('../../../muon/transport/rabbit/amqp-api.js');
var assert = require('assert');
var expect = require('expect.js');
var events = require('../../../muon/domain/events.js');

describe("amqp api test", function () {

    this.timeout(8000);

      after(function() {

      });

    it("send and receive a simple message", function (done) {
            var url = "amqp://muon:microservices@localhost";
            var numMessages = 1;
            var messageCount = 0;

            console.log('connecting via amqp api');
            var amqpConnect = amqpApi.connect(url);

            console.log('connect.tehn()...');
             amqpConnect.then(function (api) {

                   var payload = {message: "amqp_api_test_message"};

                   console.log('waiting for message');
                   api.inbound('api_test_queue').listen(function(event) {
                       console.log('message received: ' + JSON.stringify(event));
                       assert.equal(event.payload.data.message, payload.message);
                       messageCount++;
                       if (messageCount == numMessages) {
                            done();
                       }

                   });
                  console.log('sending payload');
                  for (var i = 0 ; i < numMessages ; i++) {
                            payload.id = i;
                            var event = events.rpcEvent(payload, 'test', 'muon://testservice/', 'text/plain');
                            api.outbound('api_test_queue').send(event);
                  }

            }, function (err) {
                console.log("muon promise.then() error!!!!!");
                throw new Error('error in return amqp-api promise');
            }).catch(function(error) {
               console.log("amqp-api-test.js connection.then() error!!!!!: " + error);
                throw new Error('error in return muon promise in amqp-api-test-test.js', error);

            });

    });

});