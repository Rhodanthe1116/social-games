export function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png')
  this.load.image('otherPlayer', 'assets/enemyBlack5.png')
  this.load.image('star', 'assets/star_gold.png')
}

export function addPlayer(main, playerInfo, myNameEle) {
  var shipImg = main.add.image(0, 0, 'ship').setDisplaySize(53, 40)
  var textColor = playerInfo.team === 'blue' ? '#9999ff' : '#ff9999'
  console.log(textColor)
  var playerName = main.add.text(0, 0, playerInfo.name, {
    font: '24px Arial',
    color: textColor,
  })

  var container = main.add.container(playerInfo.x, playerInfo.y)
  container.add(shipImg)
  container.add(playerName)
  container.setSize(64, 64)
  main.physics.world.enable(container)

  main.ship = container

  main.ship.body.setDrag(100)
  main.ship.body.setAngularDrag(100)
  main.ship.body.setMaxVelocity(200)

  myNameEle.value = playerInfo.name
}

export function addOtherPlayers(main, playerInfo) {
  const shipImg = main.add.image(0, 0, 'otherPlayer').setDisplaySize(53, 40)
  const textColor = playerInfo.team === 'blue' ? '#9999ff' : '#ff9999'
  const playerName = main.add.text(0, 0, playerInfo.name, {
    color: textColor,
  })

  var container = main.add.container(playerInfo.x, playerInfo.y)
  container.add(shipImg)
  container.add(playerName)
  container.setSize(64, 64)
  main.physics.world.enable(container)

  const otherPlayer = container

  otherPlayer.playerId = playerInfo.playerId
  main.otherPlayers.add(otherPlayer)
}

export function addGameEvent(main) {
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
}

export function create(main) {
  main.cursors = main.input.keyboard.createCursorKeys()

  main.blueScoreText = main.add.text(16, 16, '', {
    fontSize: '32px',
    fill: '#9999FF',
  })
  main.winnerText = main.add.text(256, 16, '', {
    fontSize: '32px',
    fill: '#ffffff',
  })
  main.redScoreText = main.add.text(584, 16, '', {
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
    // pushMessage(msg)
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

export function update(main, myNameEle) {
  if (main.ship) {
    if (main.cursors.left.isDown) {
      main.ship.body.setAngularVelocity(-150)
    } else if (main.cursors.right.isDown) {
      main.ship.body.setAngularVelocity(150)
    } else {
      main.ship.body.setAngularVelocity(0)
    }

    if (main.cursors.up.isDown) {
      main.physics.velocityFromRotation(
        main.ship.rotation + 1.5,
        100,
        main.ship.body.acceleration
      )
    } else {
      main.ship.body.setAcceleration(0)
    }

    main.physics.world.wrap(main.ship, 5)

    var x = main.ship.x
    var y = main.ship.y
    var r = main.ship.rotation
    if (
      main.ship.oldPosition &&
      (x !== main.ship.oldPosition.x ||
        y !== main.ship.oldPosition.y ||
        r !== main.ship.oldPosition.rotation)
    ) {
      main.socket.emit('playerMovement', {
        x: main.ship.x,
        y: main.ship.y,
        rotation: main.ship.rotation,
      })
    }

    main.ship.oldPosition = {
      x: main.ship.x,
      y: main.ship.y,
      rotation: main.ship.rotation,
    }

    // set name
    const newName = myNameEle.value
    var text = main.ship.getAt(1)
    text.setText(newName)
    main.socket.emit('nameSet', newName)
  }
}
