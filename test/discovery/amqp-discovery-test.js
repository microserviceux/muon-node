require('mocha-sinon');
var sinon = require("sinon");
var assert = require('assert');
var url = require('url');
var expect = require('expect.js');
var _ = require('underscore');
var AmqpDiscovery = require("../../muon/discovery/amqp/discovery.js");
require('sexylog');

var discovery1;
var discovery2;
var discovery3;

describe("AMQP Discovery: ", function () {

    afterEach(function () {
        discovery1.close();
        discovery2.close();
        if (discovery3) discovery3.close();
        discovery1 = null
        discovery2 = null
        discovery3 = null
    });

    it("Discoveries can locate each other over the amqp broker", function (done) {
        this.timeout(12000);

        discovery1 = new AmqpDiscovery(process.env.MUON_URL || "amqp://muon:microservices@localhost", 500);
        discovery2 = new AmqpDiscovery(process.env.MUON_URL || "amqp://muon:microservices@localhost", 500);
        discovery3 = new AmqpDiscovery(process.env.MUON_URL || "amqp://muon:microservices@localhost", 500);

        discovery1.advertiseLocalService({
            identifier: "tombola",
            tags: ["node", "tombola"],
            codecs: ["application/json"],
            connectionUrls: [process.env.MUON_URL || "amqp://muon:microservices@localhost"]
        });

        discovery2.advertiseLocalService({
            identifier: "simple",
            tags: ["node", "simple"],
            codecs: ["application/json"],
            connectionUrls: [process.env.MUON_URL || "amqp://muon:microservices@localhost"]
        });

        discovery3.advertiseLocalService({
            identifier: "awesomeService",
            tags: ["node", "awesomeService"],
            codecs: ["application/json"],
            connectionUrls: [process.env.MUON_URL || "amqp://muon:microservices@localhost"]
        });

        discovery1.discoverServices(function (services) {
            assert.ok(services.find('simple'), 'could not find "simple" service in discovery list (services=)' + JSON.stringify(services) + ')');
            assert.ok(services.find('tombola'), 'could not find "tombola" service in discovery list (services=' + JSON.stringify(services) + ')');
            assert.ok(services.find('awesomeService'), 'could not find "awesomeService" service in discovery list (services=' + JSON.stringify(services) + ')');
            done();
        });
    });

  it("Discovery cache will expire", function (done) {
    this.timeout(15000);

    discovery1 = new AmqpDiscovery(process.env.MUON_URL || "amqp://muon:microservices@localhost", 500);
    discovery2 = new AmqpDiscovery(process.env.MUON_URL || "amqp://muon:microservices@localhost", 500);

    discovery1.advertiseLocalService({
      identifier: "cachingService",
      tags: ["node", "tombola"],
      codecs: ["application/json"],
      connectionUrls: [process.env.MUON_URL || "amqp://muon:microservices@localhost"]
    });

    discovery2.advertiseLocalService({
      identifier: "discoveredService",
      tags: ["node", "simple"],
      codecs: ["application/json"],
      connectionUrls: [process.env.MUON_URL || "amqp://muon:microservices@localhost"]
    });

    discovery1.discoverServices(function (services) {

      discovery2.shutdown()

      setTimeout(function() {
        discovery1.discoverServices(function (services) {
          assert.ok(services.find('discoveredService') == null, 'Found "simple" service in discovery list (services=)' + JSON.stringify(services) + '), and didnt expoect to');
          done();
        })
      }, 6000)
    });
  });
});
