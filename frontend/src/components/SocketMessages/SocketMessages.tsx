import './SocketMessages.styles.scss'
import { Message } from "@components/SocketMessages/SocketMessages.types"
import { useEffect, useState } from "react"
import { Socket } from "src/socket"
import ArrowUpIcon from '@assets/arrowUp.svg'
import ArrowDownIcon from '@assets/arrowDown.svg'
import CodeIcon from '@assets/code.svg'

export const socket = new Socket('ws://localhost:3001')

function SocketMessages() {
    const [state, setState] = useState<Message[]>([])

    const sendHi = () => {
        const message = {type: 'hi'}
        socket.send(message)

        setState((v) => [
            ...v,
            {
                type: 'out',
                time: new Date().toLocaleTimeString(),
                value: JSON.stringify(message)
            }
        ])
    }

    useEffect(() => {
        socket.onStatus((status) => {
            setState((v) => [
                ...v,
                {
                    type: 'verbose',
                    time: new Date().toLocaleTimeString(),
                    value: 'websocket status ' + status
                }
            ])
        })

        socket.onMessage((data) => {
            setState((v) => [
                ...v,
                {
                    type: 'in',
                    time: new Date().toLocaleTimeString(),
                    value: data
                }
            ])
        })

        socket.connect().then(() => {
            sendHi()
        })
    }, [])

    return (
        <div className="socket-messages">
            <button
                children="Send HI"
                onClick={sendHi}
            />

            <div className="messages">
                {state.map(({type, time, value}, index) => (
                    <div
                        key={type + time + value + index}
                        className={'message message__' + type}
                    >
                        <div className="time">
                            {time}
                        </div>

                        {
                            type == 'out'
                                ? <ArrowUpIcon />
                                : type == 'in'
                                    ? <ArrowDownIcon />
                                    : <CodeIcon />
                        }

                        <div className="content">
                            {value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}