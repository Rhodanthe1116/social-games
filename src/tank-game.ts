import socket, { Server, Socket } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
import { Player } from 'src'

import { choose } from './utils'

interface PlayerGameInfo {
  tankNum: 1 | 2
}

// type TankPlayer = Player<PlayerGameInfo>
type TankPlayer = Player<any> | PlayerGameInfo

interface Room {
  id: string
  player1Id?: string
  player2Id?: string

  // players: Record<string, Player<any>>
}
const rooms: Record<string, Room> = {}

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
// let winner = ''

const event = {
  server: {
    connected: 'connected',
    player2Connected: 'player2Connected',
    remotePlayerChanged: 'remotePlayerChanged',
  },
  client: {
    playerChanged: 'playerChanged',
  },
}
export function onConnection(
  io: socket.Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  socket: socket.Socket<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    any
  >,
  roomId: string,
  players: Record<string, TankPlayer>,
  query: any
) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      // player1: {},
    }
  }
  const room = rooms[roomId]
  console.log({ room })

  socket.emit(event.server.connected, {})
  // if (room.player1Id === undefined) {
  //   players[socket.id] = {
  //     id: socket.id,
  //     name: socket.id,
  //     tankNum: 1,
  //   }
  //   room.player1Id = socket.id
  //   socket.emit(event.server.connected, players[room.player1Id])
  // } else if (room.player2Id === undefined) {
  //   players[socket.id] = {
  //     id: socket.id,
  //     name: socket.id,
  //     tankNum: 2,
  //   }
  //   room.player2Id = socket.id
  //   socket.emit(event.server.connected, players[room.player1Id])
  //   socket
  //     .to(roomId)
  //     .emit(event.server.player2Connected, players[room.player2Id])
  // } else {
  //   console.log('房間已滿')
  //   return
  // }

  const player = players[socket.id]
  console.log({ player })

  // when a player moves, update the player data
  socket.on(event.client.playerChanged, function (player) {
    player.id = socket.id
    players[socket.id] = player
    // emit a message to all players about the player that moved
    socket.to(roomId).emit(event.server.remotePlayerChanged, players[socket.id])
  })

  // send the players object to the new player
  // socket.emit('connected', rooms[roomId].player2Id)

  // try {
  //   const msgs = await Message.find()
  //   socket.emit('messages', msgs)
  // } catch (err) {
  //   console.log(err)
  // }

  // update all other players of the new player

  socket.on('disconnect', function () {
    console.log('user disconnected')

    delete players[socket.id]
    if (rooms[roomId].player1Id && rooms[roomId]?.player1Id === socket.id) {
      delete rooms[roomId].player1Id
    }
    if (rooms[roomId].player2Id && rooms[roomId]?.player2Id === socket.id) {
      delete rooms[roomId].player2Id
    }

    socket.to(roomId).emit('playerDisconnect', socket.id)
  })
}
