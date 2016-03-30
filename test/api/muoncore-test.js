var muoncore = require('../../muon/api/muoncore.js');
var assert = require('assert');

var muon;
var muon2;

describe("Muon core test", function () {


    this.timeout(30000);
    var serviceName = "example-service";
    var amqpurl = "amqp://muon:microservices@localhost";


    before(function () {
        muon = muoncore.create(serviceName, amqpurl);
        muon.handle('muon://example-service/tennis', function (event, respond) {
            logger.info('*****  muon://service/tennis: muoncore-test.js *************************************************');
            logger.debug('muon://service/tennis server responding to event.id=' + event.id);
            respond("pong");
        });
    });

    after(function() {
       muon.shutdown();
       muon2.shutdown();
    });

    it("create request protocol stack", function (done) {

        muon2 = muoncore.create("example-client", amqpurl);

        setTimeout(function () {

            var promise = muon2.request('muon://example-service/tennis', "ping");

            promise.then(function (event) {
                logger.info("muon://example-client server response received! event.id=" + event.id);
                logger.info("muon://example-client server response received! event=" + JSON.stringify(event));
                logger.info("muon promise.then() asserting response...");
                assert(event, "request event is undefined");
                assert.equal(event.payload, "pong", "expected 'pong' response message from muon://example-service/tennis")
                done();
            }, function (err) {
                logger.error("muon promise.then() error!!!!!");
                throw new Error('error in return muon promise');
            }).catch(function(error) {
                logger.error("muoncore-test.js promise.then() error!!!!!: " + error);
                throw new Error('error in return muon promise in muoncore-test.js', error);

            });

        }, 1500);

    });
});




