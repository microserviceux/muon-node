var handler = require('../infrastructure/handler.js');


exports.newHandler = function() {
         var rpcProtocolHandler = handler.create();

        // OUTGOING/DOWNSTREAM event handling protocol logic
         rpcProtocolHandler.outgoing(function(event) {
                logger.info("rpc protocol outgoing event id=" + event.id);
                return event;
         });

         // INCOMING/UPSTREAM  event handling protocol logic
         rpcProtocolHandler.incoming(function(event) {
                logger.info("rpc protocol incoming event id=" + event.id);
                return event;
         });
         logger.info('**** rpc proto: '+JSON.stringify(rpcProtocolHandler));
         return rpcProtocolHandler;


}