require("sexylog");
var AmqpDiscovery = require("./muon/discovery/amqp/amqp-discovery.js");
var AmqpTransport = require("./muon/transport/amqp/amqp09-transport");

var discovery = new AmqpDiscovery("amqp://muon:microservices@localhost");
discovery.advertiseLocalService({
    identifier:"awesome",
    tags:["node", "awesome"],
    codecs:["application/json"]
});

var transport = new AmqpTransport("amqp://muon:microservices@localhost");

setTimeout(function() {

    var connection = transport.openChannel("ExampleService", "request");

    connection.listen(function(response) {
        logger.info("The channel replied");
        console.dir(response.payload);
    });

    connection.send({
        headers:{
            eventType:"RequestMade",
            id:"simples",
            targetService:"ExampleService",
            sourceService:"awesome",
            protocol:"request",
            url:"/",
            "Content-Type":"application/json",
            sourceAvailableContentTypes:["application/json"],
            channelOperation:"NORMAL"
        },
        payload:{
            be:"happy"
        }});

    setTimeout(function() {
        connection.send("poison");
    }, 7000);

}, 4500);
