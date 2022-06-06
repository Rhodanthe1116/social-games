import socket, { Server, Socket } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'

import { choose } from './utils'

interface Player {
  id: string
  rotation: number
  x: number
  y: number
  playerId: string
  team: 'red' | 'blue'
  name: string
}

// game config
const goal = 100
const starScore = 23
const star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50,
}
const scores = {
  blue: 0,
  red: 0,
}
let winner = ''

export function onConnection(
  io: socket.Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  socket: socket.Socket<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    any
  >,
  roomId,
  players: any
) {
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
  socket.to(roomId).emit('newPlayer', players[socket.id])

  socket.on('disconnect', function () {
    console.log('user disconnected')

    delete players[socket.id]
    socket.to(roomId).emit('playerDisconnect', socket.id)
  })

  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x
    players[socket.id].y = movementData.y
    players[socket.id].rotation = movementData.rotation
    // emit a message to all players about the player that moved
    socket.to(roomId).emit('playerMoved', players[socket.id])
  })
  socket.on('nameSet', function (name) {
    players[socket.id].name = name
    // emit a message to all players about the player that changed name
    socket.to(roomId).emit('somePlayerNameSet', players[socket.id])
  })

  socket.on('chat message', (msg) => {
    msg.from = players[socket.id].name
    msg.timestamp = new Date().toISOString()
    io.to(roomId).emit('chat message', msg)

    // const newMsg = new Message({ ...msg })
    // newMsg.save((err, msg) => {
    //   if (err) {
    //     console.log(err)
    //   }
    //   console.log('a msg saved: ', msg)
    // })
  })

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
}
