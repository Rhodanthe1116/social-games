export function pushMessage(msg) {
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

export function addChat(main) {
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
}
