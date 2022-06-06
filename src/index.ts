import cors from 'cors'
import express from 'express'
import http from 'http'
import { nanoid } from 'nanoid'
import path from 'path'
import socket, { Server, Socket } from 'socket.io'
import { v4 as uuid } from 'uuid'

import * as DemoGame from './demo-game'
import Message from './models/message'
import { logUserInfo } from './socket/utils'
import * as TankGame from './tank-game'

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
app.use(cors())
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

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
export interface Player<T> {
  id: string
  playerId?: string
  name: string
  gameInfo: Record<string, T>
}
interface Room {
  id: string
  players: Record<string, Player<any>>
  gameId: string
}
const rooms: Record<string, Room> = {}

const PROJECT_ROOT = __dirname + '/..'
app.use(express.static(PROJECT_ROOT + '/public'))

app.get('/', (req, res) => {
  const roomId = nanoid(6)
  console.log(`New room created!: ${roomId}`)
  res.redirect(`/${roomId}`)
})

app.get('/:room', (req, res) => {
  res.sendFile(path.resolve(PROJECT_ROOT + '/views' + '/index.html'))
})

const webRTC = {
  server: {
    userConnected: 'webrtc-user-connected',
    userDisconnected: 'webrtc-user-disconnected',
  },
  client: {
    connected: 'webrtc-connected',
  },
}

io.on('connection', async function (socket) {
  logUserInfo(socket)
  const { roomId, newGameId } = socket.handshake.query
  if (typeof roomId !== 'string' || roomId === '') {
    console.log('no roomId')
    return
  }
  console.log('roomId:', roomId)

  if (!rooms[roomId]) {
    let gameId = newGameId
    if (typeof gameId !== 'string') {
      console.log('no newGameId', gameId)
      gameId = 'demo'
    }
    rooms[roomId] = {
      id: roomId,
      players: {},
      gameId: gameId,
    }
  }
  socket.join(roomId)

  const players = rooms[roomId].players

  socket.on(webRTC.client.connected, (roomId, userId) => {
    socket.to(roomId).emit(webRTC.server.userConnected, userId)

    socket.on('disconnect', () => {
      socket.to(roomId).emit(webRTC.server.userDisconnected, userId)
    })
  })

  if (rooms[roomId].gameId === 'demo') {
    DemoGame.onConnection(io, socket, roomId, players)
  } else {
    TankGame.onConnection(io, socket, roomId, players, socket.handshake.query)
  }
})

const PORT = process.env.PORT || 8081

server.listen(PORT, function () {
  console.log(`Listening on ${PORT}`)
})
