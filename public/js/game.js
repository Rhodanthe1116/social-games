var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: "phaser-example",

    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
};

var game = new Phaser.Game(config);

function preload() {
    this.load.image('ship', 'assets/spaceShips_001.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    this.load.image('star', 'assets/star_gold.png');
}

function create() {
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.socket.on('currentPlayers', function(players) {
        Object.keys(players).forEach(function(id) {
            if (players[id].playerId === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });
    this.socket.on('newPlayer', function(playerInfo) {
        addOtherPlayers(self, playerInfo);
    });
    this.socket.on('playerDisconnect', function(playerId) {
        self.otherPlayers.getChildren().forEach(function(otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function(playerInfo) {
        self.otherPlayers.getChildren().forEach(function(otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });

    this.socket.on('somePlayerNameSet', function(playerInfo) {
        self.otherPlayers.getChildren().forEach(function(otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                var text = otherPlayer.getAt(1)
                text.setText(playerInfo.name);
            }
        });
    });

    // chat
    /*
        msg {
            msg: "",
            from: "",
            timestamp: "",
        }
    */
    this.socket.on('messages', function(msgs) {
        msgs.forEach(msg => {
            pushMessage(msg)
        })
    });

    var form = document.getElementById('message-form')
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // prevents page reloading

        var message = document.getElementById('m')
        const msg = {
            msg: message.value,
        }
        self.socket.emit('chat message', msg);
        message.value = '💩';

        return false;
    });
    this.socket.on('chat message', function(msg) {
        pushMessage(msg)
    });
    // end chat

    this.cursors = this.input.keyboard.createCursorKeys();

    this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#9999FF' });
    this.winnerText = this.add.text(256, 16, '', { fontSize: '32px', fill: '#ffffff' });
    this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF9999' });

    this.socket.on('scoreUpdate', function(scores) {
        self.blueScoreText.setText('Blue: ' + scores.blue);
        self.redScoreText.setText('Red: ' + scores.red);
    });

    this.socket.on('winner', function(winner) {
        self.winnerText.setText('Winner: ' + winner);
        const msg = {
            msg: 'Winner: ' + winner,
            from: 'System',
            timestamp: new Date().toISOString().split('T')[0]
        }
        pushMessage(msg)
    });

    this.socket.on('starLocation', function(starLocation) {
        if (self.star) self.star.destroy();
        self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
        self.star.collected = false;
        self.physics.add.overlap(self.ship, self.star, function() {
            if (!self.star.collected) {
                this.socket.emit('starCollected');
                self.star.collected = true
            }
        }, null, self);
    });

    this.socket.on('nameSet', function(winner) {
        self.winnerText.setText('Winner: ' + winner);
    });

}

function update() {
    if (this.ship) {
        if (this.cursors.left.isDown) {
            this.ship.body.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
            this.ship.body.setAngularVelocity(150);
        } else {
            this.ship.body.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
            this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
        } else {
            this.ship.body.setAcceleration(0);
        }

        this.physics.world.wrap(this.ship, 5);

        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
            this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }

        this.ship.oldPosition = {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };

        // set name
        newName = document.getElementById('player-name').value
        var text = this.ship.getAt(1)
        text.setText(newName);
        this.socket.emit('nameSet', newName);
    }
}

function addPlayer(self, playerInfo) {

    var shipImg = self.add.image(0, 0, 'ship').setDisplaySize(53, 40);
    var textColor = playerInfo.team === 'blue' ? '#9999ff' : '#ff9999'
    console.log(textColor)
    var playerName = self.add.text(0, 0, playerInfo.name, { color: textColor });

    var container = self.add.container(playerInfo.x, playerInfo.y);
    container.add(shipImg);
    container.add(playerName);
    container.setSize(64, 64);
    self.physics.world.enable(container);

    self.ship = container

    self.ship.body.setDrag(100);
    self.ship.body.setAngularDrag(100);
    self.ship.body.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
    const shipImg = self.add.image(0, 0, 'otherPlayer').setDisplaySize(53, 40);
    const textColor = playerInfo.team === 'blue' ? '#9999ff' : '#ff9999'
    const playerName = self.add.text(0, 0, playerInfo.name, { color: textColor });

    var container = self.add.container(playerInfo.x, playerInfo.y);
    container.add(shipImg);
    container.add(playerName);
    container.setSize(64, 64);
    self.physics.world.enable(container);

    otherPlayer = container


    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

function pushMessage(msg) {
    var messages = document.querySelector('#messages')
    const shouldScroll = messages.scrollTop + messages.clientHeight === messages.scrollHeight;

    var node = document.createElement("LI");                 // Create a <li> node
    // Create a text node
    var textnode = document.createTextNode(`${msg.from}: ${msg.msg}`); 
    node.appendChild(textnode);                              // Append the text to <li>
    messages.appendChild(node);

    if (!shouldScroll) {
        messages.scrollTop = messages.scrollHeight;
    }
}


