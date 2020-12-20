var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// models
const Message = require('./models/message');

// db
const mongoose = require('mongoose');
const uri = process.env.ATLAS_URI;
if (!uri) {
  console.log("no atlas uri")
}
mongoose.connect(uri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true
}
);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

// game config
const goal = 100
const starScore = 23


/*
    {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue',
        name: `Player-${socket.id}`
    };
*/
var players = {};
var star = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
};
var scores = {
    blue: 0,
    red: 0
};
var winner = ''

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', async function(socket) {
    console.log('a user connected');
    var forwardAddress = socket.handshake.headers['x-forwarded-for'].split(',')[0]
    var address = socket.handshake.address
    console.log('New connection from ' + forwardAddress + address);

    // create a new player and add it to our players object
    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue',
        name: `Player-${socket.id}`
    };

    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // send the star object to the new player
    socket.emit('starLocation', star);
    // send the current scores
    socket.emit('scoreUpdate', scores);

    try {
        const msgs = await Message.find()
        socket.emit('messages', msgs)
    } catch (err) {
        console.log(err)
    }

    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function() {
        console.log('user disconnected');

        delete players[socket.id];
        socket.broadcast.emit('playerDisconnect', socket.id);
    });

    // when a player moves, update the player data
    socket.on('playerMovement', function(movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;
        // emit a message to all players about the player that moved
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });
    socket.on('nameSet', function(name) {
        players[socket.id].name = name;
        // emit a message to all players about the player that changed name
        socket.broadcast.emit('somePlayerNameSet', players[socket.id]);
    });

    socket.on('chat message', (msg) => {
        msg.from = players[socket.id].name
        msg.timestamp = new Date().toISOString()
        console.log(msg)
        io.emit('chat message', msg);

        const newMsg = new Message({...msg})
        newMsg.save((err, msg) => {
            if (err) {
                console.log(err)
            }
            console.log("a msg saved: ", msg);
        })

    });

    socket.on('starCollected', function() {
        if (players[socket.id].team === 'red') {
            scores.red += starScore;
        } else {
            scores.blue += starScore;
        }

        if (scores.red >= goal) {
            winner = 'red'
            scores.red = 0
            scores.blue = 0
            io.emit('winner', winner);
        } else if (scores.blue >= goal) {
            winner = 'blue'
            scores.red = 0
            scores.blue = 0
            io.emit('winner', winner);
        }
        star.x = Math.floor(Math.random() * 700) + 50;
        star.y = Math.floor(Math.random() * 500) + 50;
        io.emit('starLocation', star);
        io.emit('scoreUpdate', scores);
    });


});



server.listen(8081, function() {
    console.log(`Listening on ${server.address().port}`);
});