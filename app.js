var app = require('express')();
var twilio = require('twilio');    
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res){
  res.sendfile('static/index.html');
});

app.post('/log', function(req, res) {
    console.log("Received status callback...");
    var client = new twilio.RestClient(process.env.TWILIO_ACCOUNT_SID,
                                       process.env.TWILIO_AUTH_TOKEN);
    var status = req.body.MessageStatus;
    var sid = req.body.MessageSid;

    if (status == 'delivered') {
        client.messages(sid).media.list(function(err, response) {
            if (err) {
                res.json("{'status': 'Error'}");
            }
            response.mediaList.forEach(function(media) {
                io.emit('new_media', "https://api.twilio.com/" + media.uri.replace('.json', ''));
            });
        });
    }
    
    if (status == 'failed') {
        io.emit('error', "An error occured.");
    }
    res.json("{'status': 'OK'}");
});

function streamImagesToNewUser(id) {
    var client = new twilio.RestClient(process.env.TWILIO_ACCOUNT_SID,
                                       process.env.TWILIO_AUTH_TOKEN);
    client.messages.get({from: process.env.TWILIO_CALLER_ID,
                        status: 'delivered',
                        num_media: 1,
                        PageSize: 100}, function(err, response) {
        if (err) {
            res.status(500);
            res.json(err);
        } else {
            response.messages.forEach(function(message) {
                if (message.num_media != '0') {
                    client.messages(message.sid).media.list(function(err, response) {
                        if (err) {
                        } else {
                            response.mediaList.forEach(function(media) {
                                url = "https://api.twilio.com/" + media.uri.replace('.json', '');
                                io.to(id).emit('loading_media', "https://api.twilio.com/" + media.uri.replace('.json', ''));
                            });
                        }
                    });
                }
            });
        }
    });
}

io.on('connection', function(socket){
  io.to(socket.id).emit('connected', 'Connected!');

  streamImagesToNewUser(socket.id);

  socket.on('new_media', function(url){
    io.emit('stash', url);
  });

  socket.on('error', function(err){
    io.emit('error', err);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
