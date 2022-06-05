import { pushMessage } from './chat.js'

const myNameEle = document.getElementById('player-name')

const ROOM_ID = window.location.pathname.substring(1)

const videoGrid = document.getElementById('video-grid')
function createVideoElement(id = '', muted = true) {
  const videoContainer = document.createElement('div')
  videoContainer.setAttribute('id', id)
  videoContainer.setAttribute(
    'style',
    'background: black; color: white; display: flex; flex-direction: column;'
  )
  const video = document.createElement('video')
  video.muted = muted
  const p = document.createElement('p')
  p.setAttribute('style', 'text-align: center; margin-bottom: 3px')
  videoContainer.append(video)
  videoContainer.append(p)
  videoGrid.append(videoContainer)
  return { videoContainer, video, p }
}
function addVideoStream(videoContainer, stream, label = '') {
  const video = videoContainer.children[0]
  const p = videoContainer.children[1]
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  p.textContent = label
}

const webRTC = {
  server: {
    userConnected: 'webrtc-user-connected',
    userDisconnected: 'webrtc-user-disconnected',
  },
  client: {
    connected: 'webrtc-connected',
  },
}
export function onConnected(main, myId) {
  // WebRTC
  // needs my socket id
  // WebRTC
  main.myPeer = undefined
  main.myStream = undefined
  main.callWith = {}

  function s(playerId) {
    return main.players[playerId]?.name ?? playerId
  }

  const { videoContainer: myVideoContainer } = createVideoElement('my', true)

  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .catch((error) => {
      pushMessage('無法取得視訊')
    })
    .then((stream) => {
      if (!stream) {
        return
      }
      main.myStream = stream
      addVideoStream(myVideoContainer, stream, myNameEle.value)
      pushMessage('已取得視訊')

      main.myPeer = new Peer(myId, {
        // needs myId
        secure: true,
        host: 'peerjs-2022.herokuapp.com',
        // port: '3001',
        debug: 4,
      })
      main.myPeer.on('open', (id) => {
        pushMessage(`已開啟連線，加入房間`)
        main.socket.emit(webRTC.client.connected, ROOM_ID, id)
      })

      // 等待回應對方
      main.myPeer.on('call', (call) => {
        pushMessage(`${s(call.peer)} 請求連線`)
        if (main.myStream === undefined) {
          pushMessage('尚未取得視訊，未回應')
          return
        }
        call.answer(main.myStream)
        pushMessage(`已回應 ${s(call.peer)} 的請求`)

        handleNewCall(call, call.peer)
      })

      // 有人加入房間，主動呼叫對方
      main.socket.on(webRTC.server.userConnected, (playerId) => {
        pushMessage(`${s(playerId)} 已加入房間`)
        callToNewPlayer(playerId, main.myStream)
      })

      // 有人離線（離開房間）
      main.socket.on(webRTC.server.userDisconnected, (playerId) => {
        pushMessage(`${s(playerId)} 已離線`)

        if (main.callWith[playerId]) {
          main.callWith[playerId].close()
        } else {
          pushMessage(`警告: ${playerId} 不存在`)
        }
      })
    })

  function callToNewPlayer(playerId, myStream) {
    if (myStream === undefined) {
      pushMessage('stream not found: ')
      return
    }
    // if (main.callWith[playerId]) {
    //   console.log('已與 ' + s(playerId) + ' 連線')
    //   return
    // }
    const call = main.myPeer.call(playerId, myStream)
    if (call === undefined) {
      pushMessage('user call not found: ' + s(playerId))
      return
    }
    pushMessage(`呼叫 ${s(playerId)}`)

    handleNewCall(call, playerId)
  }

  function handleNewCall(call, playerId) {
    const { videoContainer, video } = createVideoElement(playerId)
    //   video.muted = true
    call.on('stream', (userVideoStream) => {
      handleOnStream(userVideoStream, videoContainer, playerId, call)
    })
    call.on('close', () => {
      pushMessage(`結束與 ${s(playerId)} 的連線 `)
      video.remove()
      videoContainer.remove()
    })
    call.on('error', (err) => {
      pushMessage(`與 ${s(playerId)} 的連線出了錯誤 ` + err)
      console.log(err)
    })
  }
  function handleOnStream(
    userVideoStream,
    videoContainer,
    playerId,
    callToNewPlayer
  ) {
    if (main.callWith[playerId] !== undefined) {
      return
    }
    pushMessage(`已與 ${s(playerId)} 建立串流 `)
    addVideoStream(videoContainer, userVideoStream, s(playerId))
    if (callToNewPlayer) {
      main.callWith[playerId] = callToNewPlayer
    }
  }
}
