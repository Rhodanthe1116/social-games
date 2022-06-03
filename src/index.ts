import express from 'express'
import http from 'http'
import path from 'path'
import socket, { Server, Socket } from 'socket.io'
import { v4 as uuid } from 'uuid'

import Message from './models/message'
import { logUserInfo } from './socket/utils'
import { choose } from './utils'

interface ServerToClientEvents {
  noArg: () => void
  basicEmit: (a: number, b: string, c: Buffer) => void
  withAck: (d: string, callback: (e: number) => void) => void
}

interface ClientToServerEvents {
  hello: () => void
}

interface InterServerEvents {
  ping: () => void
}

interface SocketData {
  name: string
  age: number
}

const app = express()
const server = http.createServer(app)
const io = new Server(server)

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
const players = {}
const star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50,
}
const scores = {
  blue: 0,
  red: 0,
}
let winner = ''

const PROJECT_ROOT = __dirname + '/..'
app.use(express.static(PROJECT_ROOT + '/public'))

app.get('/', (req, res) => {
  const roomId = uuid()
  console.log(`New room created!: ${roomId}`)
  res.redirect(`/${roomId}`)
})

app.get('/:room', (req, res) => {
  res.sendFile(path.resolve(PROJECT_ROOT + '/views' + '/index.html'))
})

io.on('connection', async function (socket) {
  logUserInfo(socket)

  socket.on('webrtc-join-room', (roomId, userId) => {
    // socket.join(roomId)
    // socket.to(roomId).emit('webrtc-user-connected', userId)
    socket.broadcast.emit('webrtc-user-connected', userId)

    socket.on('disconnect', () => {
      // socket.to(roomId).emit('webrtc-user-disconnected', userId)
      socket.broadcast.emit('webrtc-user-disconnected', userId)
    })
  })

  // create a new player and add it to our players object
  players[socket.id] = {
    id: socket.id,
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: Math.floor(Math.random() * 2) == 0 ? 'red' : 'blue',
    name: choose([
      'Alice',
      'Bob',
      'Charlie',
      'Dave',
      'Eve',
      'Frank',
      'Grace',
      'Holly',
      'Ivy',
      'Jack',
      'Karen',
      'Lily',
      'Molly',
      'Nancy',
      'Oscar',
      'Peggy',
      'Queen',
      'Ralph',
      'Sally',
      'Tina',
      'Uma',
      'Vicky',
      'Wendy',
      'Xena',
      'Yolanda',
      'Zoe',
    ]),
  }

  // send the players object to the new player
  socket.emit('connected', players)
  // send the star object to the new player
  socket.emit('starLocation', star)
  // send the current scores
  socket.emit('scoreUpdate', scores)

  // try {
  //   const msgs = await Message.find()
  //   socket.emit('messages', msgs)
  // } catch (err) {
  //   console.log(err)
  // }

  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id])

  socket.on('disconnect', function () {
    console.log('user disconnected')

    delete players[socket.id]
    socket.broadcast.emit('playerDisconnect', socket.id)
  })

  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x
    players[socket.id].y = movementData.y
    players[socket.id].rotation = movementData.rotation
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id])
  })
  socket.on('nameSet', function (name) {
    players[socket.id].name = name
    // emit a message to all players about the player that changed name
    socket.broadcast.emit('somePlayerNameSet', players[socket.id])
  })

  // socket.on('chat message', (msg) => {
  //   msg.from = players[socket.id].name
  //   msg.timestamp = new Date().toISOString()
  //   console.log(msg)
  //   io.emit('chat message', msg)

  //   const newMsg = new Message({ ...msg })
  //   newMsg.save((err, msg) => {
  //     if (err) {
  //       console.log(err)
  //     }
  //     console.log('a msg saved: ', msg)
  //   })
  // })

  socket.on('starCollected', function () {
    if (players[socket.id].team === 'red') {
      scores.red += starScore
    } else {
      scores.blue += starScore
    }

    if (scores.red >= goal) {
      winner = 'red'
      scores.red = 0
      scores.blue = 0
      io.emit('winner', winner)
    } else if (scores.blue >= goal) {
      winner = 'blue'
      scores.red = 0
      scores.blue = 0
      io.emit('winner', winner)
    }
    star.x = Math.floor(Math.random() * 700) + 50
    star.y = Math.floor(Math.random() * 500) + 50
    io.emit('starLocation', star)
    io.emit('scoreUpdate', scores)
  })
})

const PORT = 8081
server.listen(8081, function () {
  console.log(`Listening on ${PORT}`)
})
