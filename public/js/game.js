const myNameEle = document.getElementById('player-name')

var game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-example',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'phaser-example',
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
})

function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png')
  this.load.image('otherPlayer', 'assets/enemyBlack5.png')
  this.load.image('star', 'assets/star_gold.png')
}

function create() {
  const main = this
  mainState.socket = io()

  mainState.players = {}
  function s(playerId) {
    return main.players[playerId]?.name ?? playerId
  }

  mainState.myPeer = undefined
  mainState.peers = {}

  mainState.otherPlayers = this.physics.add.group()
  main.socket.on('connected', function (players) {
    main.players = players
    const myId = main.socket.id

    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === myId) {
        addPlayer(main, players[id])
      } else {
        addOtherPlayers(main, players[id])
      }
    })

    // WebRTC
    const videoGrid = document.getElementById('video-grid')
    main.myPeer = new Peer(myId, {
      host: '/',
      port: '3001',
      debug: 4,
    })
    console.log(main.myPeer)
    const myVideo = document.createElement('video')
    myVideo.muted = true

    function addVideoStream(video, stream, label = '') {
      video.srcObject = stream
      video.addEventListener('loadedmetadata', () => {
        video.play()
      })

      const div = document.createElement('div')
      div.append(video)
      const p = document.createElement('p')
      p.textContent = label
      div.append(p)
      videoGrid.append(div)
    }

    main.calls = []
    function connectToNewPlayer(playerId, stream) {
      pushMessage('connectToNewPlayer: ' + s(playerId))
      if (stream === undefined) {
        pushMessage('stream not found: ')
        return
      }
      const call = main.myPeer.call(playerId, stream)
      if (call === undefined) {
        pushMessage('user call not found: ' + s(playerId))
        return
      }
      const video = document.createElement('video')
      //   video.muted = true
      call.on('stream', (userVideoStream) => {
        pushMessage(`call to ${s(playerId)}, on stream: `)
        addVideoStream(video, userVideoStream, s(playerId))
      })
      call.on('close', () => {
        pushMessage(`call to ${s(playerId)}, on close: `)
        video.remove()
      })
      call.on('error', (err) => {
        pushMessage(`call to ${s(playerId)}, on error: ` + err)
        console.log(err)
      })

      main.peers[playerId] = call
      main.calls.push(call)
    }

    main.myStream = undefined
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        main.myStream = stream
        addVideoStream(myVideo, stream, myNameEle.value)
        pushMessage('getUserMedia')

        pushMessage(`${s(main.myPeer.id)}加入了房間`)
        main.socket.emit('webrtc-join-room', ROOM_ID, main.myPeer.id)
      })

    main.myPeer.on('call', (call) => {
      pushMessage('call from: ' + s(call.peer))
      if (main.myStream === undefined) {
        pushMessage('myStream not found: ')
        return
      }
      call.answer(main.myStream)
      const video = document.createElement('video')
      //   video.muted = true
      call.on('stream', (userVideoStream) => {
        console.log('call on stream')
        addVideoStream(video, userVideoStream)
      })
    })

    main.socket.on('webrtc-user-connected', (playerId) => {
      pushMessage('webrtc-user-connected: ' + s(playerId))
      connectToNewPlayer(playerId, main.myStream)
    })

    main.socket.on('webrtc-user-disconnected', (playerId) => {
      pushMessage('webrtc-user-disconnected: ' + s(playerId))

      if (main.peers[playerId]) {
        main.peers[playerId].close()
      } else {
        pushMessage('warn: peers[userId] not found, userId = ' + playerId)
      }
    })

    const ROOM_ID = window.location.pathname.substring(1)

    main.myPeer.on('open', (id) => {
      pushMessage('myPeer open: ' + s(id))
      pushMessage('webrtc-join-room')
      main.socket.emit('webrtc-join-room', ROOM_ID, id)
    })

    main.socket.on('newPlayer', function (playerInfo) {
      console.log('add other players')
      addOtherPlayers(main, playerInfo)
      main.players[playerInfo.id] = playerInfo
    })
    main.socket.on('playerDisconnect', function (playerId) {
      main.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy()
        }
      })
    })

    main.socket.on('playerMoved', function (playerInfo) {
      main.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          otherPlayer.setRotation(playerInfo.rotation)
          otherPlayer.setPosition(playerInfo.x, playerInfo.y)
        }
      })
    })

    main.socket.on('somePlayerNameSet', function (playerInfo) {
      main.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          var text = otherPlayer.getAt(1)
          text.setText(playerInfo.name)
        }
      })
    })
  })

  // chat
  /*
        msg {
            msg: "",
            from: "",
            timestamp: "",
        }
    */
  main.socket.on('messages', function (msgs) {
    msgs.forEach((msg) => {
      pushMessage(msg)
    })
  })

  var form = document.getElementById('message-form')
  form.addEventListener('submit', function (e) {
    e.preventDefault() // prevents page reloading

    var message = document.getElementById('m')
    const msg = {
      msg: message.value,
    }
    main.socket.emit('chat message', msg)
    message.value = '💩'

    //

    return false
  })
  main.socket.on('chat message', function (msg) {
    pushMessage(msg)
  })
  // end chat

  mainState.cursors = main.input.keyboard.createCursorKeys()

  mainState.blueScoreText = main.add.text(16, 16, '', {
    fontSize: '32px',
    fill: '#9999FF',
  })
  mainState.winnerText = main.add.text(256, 16, '', {
    fontSize: '32px',
    fill: '#ffffff',
  })
  mainState.redScoreText = main.add.text(584, 16, '', {
    fontSize: '32px',
    fill: '#FF9999',
  })

  main.socket.on('scoreUpdate', function (scores) {
    main.blueScoreText.setText('Blue: ' + scores.blue)
    main.redScoreText.setText('Red: ' + scores.red)
  })

  main.socket.on('winner', function (winner) {
    main.winnerText.setText('Winner: ' + winner)
    const msg = {
      msg: 'Winner: ' + winner,
      from: 'System',
      timestamp: new Date().toISOString().split('T')[0],
    }
    pushMessage(msg)
  })

  main.socket.on('starLocation', function (starLocation) {
    if (main.star) main.star.destroy()
    main.star = main.physics.add.image(starLocation.x, starLocation.y, 'star')
    main.star.collected = false
    main.physics.add.overlap(
      main.ship,
      main.star,
      function () {
        if (!main.star.collected) {
          main.socket.emit('starCollected')
          main.star.collected = true
        }
      },
      null,
      main
    )
  })

  main.socket.on('nameSet', function (winner) {
    main.winnerText.setText('Winner: ' + winner)
  })
}

function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.body.setAngularVelocity(-150)
    } else if (this.cursors.right.isDown) {
      this.ship.body.setAngularVelocity(150)
    } else {
      this.ship.body.setAngularVelocity(0)
    }

    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(
        this.ship.rotation + 1.5,
        100,
        this.ship.body.acceleration
      )
    } else {
      this.ship.body.setAcceleration(0)
    }

    this.physics.world.wrap(this.ship, 5)

    var x = this.ship.x
    var y = this.ship.y
    var r = this.ship.rotation
    if (
      this.ship.oldPosition &&
      (x !== this.ship.oldPosition.x ||
        y !== this.ship.oldPosition.y ||
        r !== this.ship.oldPosition.rotation)
    ) {
      this.socket.emit('playerMovement', {
        x: this.ship.x,
        y: this.ship.y,
        rotation: this.ship.rotation,
      })
    }

    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation,
    }

    // set name
    newName = myNameEle.value
    var text = this.ship.getAt(1)
    text.setText(newName)
    this.socket.emit('nameSet', newName)
  }
}

function addPlayer(mainState, playerInfo) {
  var shipImg = mainState.add.image(0, 0, 'ship').setDisplaySize(53, 40)
  var textColor = playerInfo.team === 'blue' ? '#9999ff' : '#ff9999'
  console.log(textColor)
  var playerName = mainState.add.text(0, 0, playerInfo.name, {
    font: '24px Arial',
    color: textColor,
  })

  var container = mainState.add.container(playerInfo.x, playerInfo.y)
  container.add(shipImg)
  container.add(playerName)
  container.setSize(64, 64)
  mainState.physics.world.enable(container)

  mainState.ship = container

  mainState.ship.body.setDrag(100)
  mainState.ship.body.setAngularDrag(100)
  mainState.ship.body.setMaxVelocity(200)

  myNameEle.value = playerInfo.name
}

function addOtherPlayers(mainState, playerInfo) {
  const shipImg = mainState.add
    .image(0, 0, 'otherPlayer')
    .setDisplaySize(53, 40)
  const textColor = playerInfo.team === 'blue' ? '#9999ff' : '#ff9999'
  const playerName = mainState.add.text(0, 0, playerInfo.name, {
    color: textColor,
  })

  var container = mainState.add.container(playerInfo.x, playerInfo.y)
  container.add(shipImg)
  container.add(playerName)
  container.setSize(64, 64)
  mainState.physics.world.enable(container)

  otherPlayer = container

  otherPlayer.playerId = playerInfo.playerId
  mainState.otherPlayers.add(otherPlayer)
}

function pushMessage(msg) {
  var messages = document.querySelector('#messages')
  const shouldScroll =
    messages.scrollTop + messages.clientHeight === messages.scrollHeight

  var node = document.createElement('LI') // Create a <li> node
  // Create a text node
  const content =
    typeof msg === 'string' ? `**${msg}**` : `${msg.from}: ${msg.msg}`
  var textnode = document.createTextNode(content)
  node.appendChild(textnode) // Append the text to <li>
  messages.appendChild(node)

  if (!shouldScroll) {
    messages.scrollTop = messages.scrollHeight
  }
}
