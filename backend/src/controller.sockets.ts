import { app } from '.'

interface ClientMessage {
    type: ClientMessageType
    data: any
}

type ClientMessageType =
    | 'hi'

app.ws('/', {
    open: (socket) => console.log('connection opened'),
    close: (socket) => console.log('connection closed'),
    message: (socket, buffer, isBinary) => {
        if (isBinary) return

        const decoder = new TextDecoder('utf-8')
        const message = JSON.parse(decoder.decode(buffer)) as ClientMessage

        switch (message.type) {
            case 'hi': {
                socket.send(JSON.stringify({
                    type: 'hi',
                    data: 'rik'
                }))
                return
            }
        }

        console.log(message)
    }
})