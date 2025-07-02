import EventEmitter from "events"

export type SocketStatus =
    | 'connecting'
    | 'connected'
    | 'closing'
    | 'closed'

type EmptyCallback = () => void
export type SocketStatusCallback = (status: SocketStatus) => void
export type SocketMessageCallback = (data: string) => void

export class Socket {
    readonly url: string
    
    private socket!: WebSocket
    private status!: SocketStatus
    private emitter: EventEmitter

    private manuallyClosed?: boolean
    private reconnectInterval?: NodeJS.Timeout

    constructor(url: string) {
        this.url = url
        this.emitter = new EventEmitter()

        window.addEventListener('offline', () => {
            this.socket?.close()
        })
    }

    connect() {
        this.changeStatus('connecting')

        let resolve: EmptyCallback
        let reject: EmptyCallback

        const promise = new Promise((pResolve, pReject) => {
            resolve = pResolve as EmptyCallback
            reject = pReject as EmptyCallback
        })

        this.socket = new WebSocket(this.url)
        this.socket.onerror = () => { reject(); this.changeStatus('closed') }
        this.socket.onopen = () => { resolve(); this.onopen.call(this) }
        this.socket.onclose = (e) => { reject(); this.onclose.call(this, e) }
        this.socket.onmessage = (e) => { resolve(); this.onmessage.call(this, e) }

        return promise
    }

    close() {
        this.changeStatus('closing')
        this.manuallyClosed = true
        this.socket.close()
    }

    onStatus(callback: SocketStatusCallback) {
        this.emitter.on('status', callback)
    }

    onMessage(callback: SocketMessageCallback) {
        this.emitter.on('message', callback)
    }

    send(data: any) {
        this.socket.send(JSON.stringify(data))
    }

    private changeStatus(status: SocketStatus) {
        this.status = status
        this.emitter.emit('status', status)
    }

    private onopen() {
        clearInterval(this.reconnectInterval)
        this.reconnectInterval = undefined

        this.changeStatus('connected')
    }

    private onclose(e: CloseEvent) {
        if (e.code == 1006) return
        this.changeStatus('closed')

        if (!this.manuallyClosed) {
            this.reconnectInterval = setInterval(() => {
                this.connect()
            }, 1000)
        }
    }

    private onmessage(e: MessageEvent<string>) {
        this.emitter.emit('message', e.data)
    }
}