import EventEmitter from "events"
import { useEffect, useRef } from "react"
import { useState } from "@utils/useState"
import { Deferred } from "@utils/std"

export interface SocketOptions {
    /** by default is `false` */
    autoConnect?: boolean

    /**
     * by default is `true`
     * 
     * works only with `autoConnect`
     */
    autoReconnect?: boolean

    /** by default is `10` */
    maxReconnectAttempts?: number

    /** by default is `500` */
    reconnectDelay?: number

    /** by default returns `true` */
    shouldReconnect?: (e: CloseEvent) => boolean
    
    /**
     * by default is `true`
     * 
     * buffers all messages from socket till socket status is set to `connected`
     */
    waitToConnect?: boolean
}

export type SocketStatus = "initialized" | "connecting" | "connected" | "closing" | "closed"
export type MessageCallback = (message: string) => void
export type TypedMessageCallback<T> = (message: T) => void
export type MessageData = string | ArrayBufferLike | Blob | ArrayBufferView

export type SocketPromiseResolve = (value: Event) => void
export type SocketPromiseReject = (reason: Event | string) => void

interface ReconnectRef {
    interval: NodeJS.Timeout | undefined
    attempt: number
}

function typeExtractor(message: any) {
    if (typeof message != "string") return undefined

    try {
        const parsed = JSON.parse(message)
        const type = parsed["type"]

        if (!type) return undefined
        return { parsed, type }
    } catch {
        return undefined
    }
}

export function useSocket<TypedMessages extends { type: string }>(url: string, options?: SocketOptions) {
    const opts = useRef({
        autoConnect: options?.autoConnect ?? false,
        autoReconnect: options?.autoReconnect ?? true,
        maxReconnectAttempts: options?.maxReconnectAttempts ?? 10,
        reconnectDelay: options?.reconnectDelay ?? 500,
        shouldReconnect: options?.shouldReconnect ?? ((e: CloseEvent) => true),
        waitToConnect: options?.waitToConnect ?? true
    })
    
    const ws = useRef<WebSocket>(null)
    const emitter = useRef(new EventEmitter())
    const typedEmitter = useRef(new EventEmitter())
    const status = useState<SocketStatus>(opts.current.autoConnect ? "connecting" : "initialized")
    const messageBuffer = useRef<any[]>([])
    const reconnect = useRef<ReconnectRef>({ interval: undefined, attempt: 0 })

    const messageHandler = (e: MessageEvent<any>) => {
        const message = e.data
        emitter.current.emit("message", message)

        const extracted = typeExtractor(message)
        if (!extracted) return

        typedEmitter.current.emit(extracted.type, extracted.parsed)
    }

    const bufferedMessageHandler = (e: MessageEvent<any>) => {
        if (status.value == "connecting") {
            messageBuffer.current.push(e.data)
            return
        }

        messageHandler(e)
    }

    const connect = () => {
        if (status.value !== "initialized" && status.value !== "closed") {
            return Promise.reject("wrong socket status to connect")
        }

        const deffered = new Deferred<Event>()
        ws.current = new WebSocket(url)
        
        ws.current.onopen = (e) => {
            clearInterval(reconnect.current.interval)
            reconnect.current.interval = undefined
            reconnect.current.attempt = 0

            status.set("connected")
            deffered.resolve(e)
        }

        ws.current.onclose = (e) => {
            status.set("closed")
            deffered.reject(e)
        }

        ws.current.onerror = (e) => {
            status.set("closed")
            deffered.reject(e)
        }

        ws.current.onmessage = opts.current.waitToConnect
            ? bufferedMessageHandler
            : messageHandler

        return deffered.promise
    }

    useEffect(() => {
        if (!opts.current.autoConnect) return

        ws.current = new WebSocket(url)
        ws.current.onopen = () => status.set("connected")
        ws.current.onerror = () => status.set("closed")

        ws.current.onclose = (e) => {
            status.set("closed")

            if (
                opts.current.autoReconnect &&
                opts.current.shouldReconnect(e)
            ) {
                reconnect.current.interval = setInterval(() => {
                    if (reconnect.current.attempt == opts.current.maxReconnectAttempts) {
                        clearInterval(reconnect.current.interval)

                        reconnect.current.interval = undefined
                        reconnect.current.attempt = 0
                        return
                    }

                    reconnect.current.attempt += 1
                    connect()
                }, opts.current.reconnectDelay)
            }
        }

        ws.current.onmessage = opts.current.waitToConnect
            ? bufferedMessageHandler
            : messageHandler

        return () => {
            if (!ws.current) return
            status.set("closing")

            ws.current.onmessage = null
            ws.current.onopen = null
            ws.current.onclose = null
            ws.current.onerror = null

            status.set("closed")
            ws.current.close()
        }
    }, [])

    useEffect(() => {
        if (!opts.current.waitToConnect) return
        if (status.value != "connected") return
        if (!messageBuffer.current.length) return

        ws.current!.onmessage = messageHandler

        setTimeout(() => {
            messageBuffer.current.forEach((message) => {
                emitter.current.emit("message", message)
            })
        }, 1)
    }, [status.value])

    const close = () => {
        if (!ws.current) return

        status.set("closing")
        emitter.current = new EventEmitter()
        typedEmitter.current = new EventEmitter()

        ws.current.onmessage = null
        ws.current.onopen = null
        ws.current.onclose = null
        ws.current.onerror = null

        status.set("closed")
        ws.current.close()
        ws.current = null
    }

    const useMessage = (cb: MessageCallback) => {
        const cbRef = useRef(cb)

        useEffect(() => {
            emitter.current.on("message", cbRef.current)
    
            return () => {
                emitter.current.off("message", cbRef.current)
            }
        }, [])
    }

    const useTypeMessage = <Type extends TypedMessages["type"]>(
        type: Type,
        cb: TypedMessageCallback<Extract<TypedMessages, { type: Type }>>
    ) => {
        const typeRef = useRef(type)
        const cbRef = useRef(cb)

        useEffect(() => {
            typedEmitter.current.on(typeRef.current, cbRef.current)
    
            return () => {
                typedEmitter.current.off(typeRef.current, cbRef.current)
            }
        }, [])
    }

    const send = (data: MessageData) => {
        if (!ws.current || status.value != "connected") return false

        try { ws.current.send(data); return true }
        catch { return false }
    }

    const sendJSON = (data: any) => {
        try { return send(JSON.stringify(data)) }
        catch { return false }
    }

    return {
        status: status.value,
        connect,
        close,
        useMessage,
        useTypeMessage,
        send,
        sendJSON
    }
}