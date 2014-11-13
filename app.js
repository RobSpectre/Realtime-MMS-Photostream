// Require dependencies
var http = require('http');
var path = require('path');
var express = require('express');
var twilio = require('twilio');
var bodyParser = require('body-parser');
 
// Create Express app and HTTP server, and configure socket.io
var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);
 
// Middleware to parse incoming HTTP POST bodies
app.use(bodyParser.urlencoded({ 
    extended: true 
}));
 
// Serve static content from the "static" directory
app.use(express.static(path.join(__dirname, 'static')));
 
// Configure port for HTTP server
app.set('port', process.env.PORT || 3000);
 
// Handle incoming MMS messages from Twilio
app.post('/message', function(request, response) {
    console.log('Received message.');
    var twiml = twilio.TwimlResponse();
    var numMedia = parseInt(request.body.NumMedia);
 
    if (numMedia > 0) {
        for (i = 0; i < numMedia; i++) {
            var mediaUrl = request.body['MediaUrl' + i];
            console.log('Displaying MediaUrl: ' + mediaUrl);
            io.emit('newMedia', mediaUrl);
        }
        twiml.message('Photo received - check the screen to see it pop up!');
    } else {
        twiml.message(':( Doesn\'t look like there was a photo in that message.');
    }
    
    response.type('text/xml');
    response.send(twiml.toString());
});
 
io.on('connection', function(socket){                                            
    socket.emit('connected', 'Connected!');                              
});
 
server.listen(app.get('port'), function() {
    console.log('Express server listening on *:' + app.get('port'));
});
