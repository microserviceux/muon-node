var _ = require("underscore");
var expect = require('expect.js');
var assert = require('assert');

var MuonConfig = require("../core/muon-config.js");

var muonServer = new MuonConfig().generateMuon("amqp://muon:microsevrices@localhost:5762");

var params = {'name': 'bob', 'email': 'bob@simple.com'};
var serverMessage = 'muon node server';

describe("Simple muon resource client/server test", function () {

    this.timeout(7000);

    before(function() {
        startServer();
    });

    it("server echoes back client query parameters", function (done) {

            muonServer.resource.query('muon://node-service/query?name=' + params.name + '&email=' + params.email, function(event, payload) {
                    console.log('muon node-service client: response event: ', event);
                    console.log('muon node-service client: response payload :',payload);

                        assert.equal(payload.message, serverMessage, 'server response message');
                        assert.equal(payload.params.name, params.name, 'user name');
                        assert.equal(payload.params.email, params.email, 'user email');
                        done();

                });
    });

});


function startServer() {

    muonServer.resource.onQuery("/query", function(event, data, respond) {
            console.log('muon node-service server onQuery("/query"): event:', event);
            respond({'message': serverMessage, 'params': event.headers.qparams});
        });
}
