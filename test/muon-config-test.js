var assert = require('assert');
var fs = require('fs');
//var expect = require('expect');




describe("Muon config test", function () {

    //this.timeout(7000);
        this.timeout(7000);

    it("test1: accepts zero config and uses sensible defaults", function (done) {
        var muonCore = require("../muon");
        var errThrown = false;
        try {
            muon = muonCore.generateMuon();
        } catch (err) {
            errThrown = true;
            assert(err);
        }
        assert(errThrown);
        done();

    });

    it("test2: accepts transport URL to define config", function (done) {
        var muonCore = require("../muon");
        var amqpUrl = "amqp://muon:microservices@localhost";
        var serviceName = "muon-config-test";

        var muon = muonCore.generateMuon(serviceName, amqpUrl);
        assert(muon);




         var payload = { 'service-id': 'muon://photon/events', 'local-id': 'abc123xyz',
                                       payload: { user: { id: '0002', first: 'Gawain', last: 'Hammond', password: 'testing', stream: 'users' } },
                                       'stream-name': 'photontest', 'server-timestamp': 1441634631338 };

        muon.command('muon://photon/events' , payload, function(event, payload) {
                console.log('photon client: response event: ', event);
                console.log('photon client: response payload :',payload);

                    //assert.equal(payload.message, serverMessage, 'server response message');
                    done();

         });




    });

    it("test3: looks for default config file", function (done) {
        var muonCore = require("../muon");
        var file = "./muon.config";
        var config = {
                 "serviceName": "muon-test-config-file",
                 "tags" : [ "" ],
                 "discovery": {
                   "type": "amqp",
                   "url": "amqp://muon:microservices@localhost"
                 },
                 "transports": [
                   { "type":"amqp", "url": "amqp://muon:microservices@localhost" }
                 ]
        }

        // write config file, run muon, then delete config file:
        fs.writeFile(file, JSON.stringify(config), function(err) {
            if(err) {
                throw new Error('unable to write config file to disk');
            }
            var muon = muonCore.generateMuon();
            assert(muon);
            fs.unlinkSync(file);
            done();
        });



    });


});