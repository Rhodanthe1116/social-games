import { Socket } from 'socket.io'

export function logUserInfo(socket: Socket) {
  console.log('a user connected')
  const ip = socket.handshake.headers['x-forwarded-for']
  const address = socket.handshake.address
  console.log('New connection from ' + ip + address)
}
