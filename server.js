const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const port = process.env.PORT || 3000;
let numUsers = 0;

app.use(express.static('public'));

// signaling
io.on('connection', function (socket) {
    console.log('New user connected');

    socket.on('create or join', function () {
        numUsers += 1;
        console.log('createor join called', numUsers);
        if (numUsers === 1) {
            console.log('Joined first participant');
            socket.emit('created');
        } else if (numUsers === 2) {
            console.log('Joined second participant');
            socket.emit('joined');
        } else {
            console.log('The room is full');
        }
    });

    socket.on('ready', function (room){
        socket.broadcast.emit('ready');
    });

    socket.on('candidate', function (event){
        socket.broadcast.emit('candidate', event);
    });

    socket.on('offer', function(event){
        socket.broadcast.emit('offer',event.sdp);
    });

    socket.on('answer', function(event){
        socket.broadcast.emit('answer',event.sdp);
    });
});

// listener
http.listen(port || 3000, function () {
    console.log('listening on', port);
});