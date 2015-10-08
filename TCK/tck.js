
var _ = require("underscore");
var muonCore = require("../muon");

var muon = muonCore.generateMuon("tck");

var queueEvents = [];

muon.onQuery("/tckQueueRes", function(request, message, response) {
    response(queueEvents);
});

var events = [];

muon.onQuery("/discover", function(event, data, respond) {
    muon.discoverServices(function(services) {
        logger.info('Discovery called');
        respond(_.collect(services, function(it) {
            return it.identifier;
        }));
    });
});

muon.onQuery("/event", function(event, data, respond) {
    respond(events);
});

muon.onCommand("/eventclear", function(event, data, respond) {
    logger.info("Clearing the event data");
    events = [];
    respond();
});

muon.onCommand("/echo", function(event, data, respond) {
    respond({
        "something":"awesome",
        "method":"command!"
    });
});

muon.onQuery("/echo", function(event, data, respond) {
    respond({
        "something":"awesome",
        "method":"query"
    });
});

var requestStore = {};

muon.onQuery("/invokeresponse", function(event, data, respond) {

    muon.query(data.resource, function(event, payload) {
        logger.info("We have a GET response");
        console.dir(payload);
        requestStore = payload;
        respond(payload);
    });
});

muon.onCommand("/invokeresponse-store", function(event, data, respond) {
    logger.info("invokeresponse-store has been requested");
    respond(requestStore);
});


logger.info("Starting Muon Node TCK Service");
logger.info("This service implements the endpoints and streams specified at http://www.github.com/muoncore/muon-protocol-specifications and will, by running those specifications against this service, certify this Muon library as compatible with the Muon ecosystem");
logger.info("For more information, see https://github.com/muoncore/muon-documentation");









