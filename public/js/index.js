import {
  addGameEvent,
  addPlayer,
  addOtherPlayers,
  update as gameUpdate,
  preload,
  create as gameCreate,
} from './game.js'
import { onConnected } from './webrtc.js'
import { addChat } from './chat.js'

const ROOM_ID = window.location.pathname.substring(1)

const myNameEle = document.getElementById('player-name')

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-example',
  backgroundColor: '#050122',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'phaser-example',
  },
  physics: {
    default: 'arcade',
    arcade: {
      // debug: true,
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
})

function create() {
  const main = this
  main.socket = io(undefined, {
    query: {
      roomId: ROOM_ID,
    },
  })

  main.players = {}

  main.otherPlayers = this.physics.add.group()

  main.socket.on('connected', function (players) {
    main.players = players
    const myId = main.socket.id

    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === myId) {
        addPlayer(main, players[id], myNameEle)
      } else {
        addOtherPlayers(main, players[id])
      }
    })

    onConnected(main, myId)

    // Game
    addGameEvent(main)
  })

  addChat(main)

  gameCreate(main)
}

function update() {
  const main = this

  gameUpdate(main, myNameEle)
}
