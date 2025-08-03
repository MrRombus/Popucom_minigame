import './SocketMessages.styles.scss'
import { Message } from "@components/SocketMessages/SocketMessages.types"
import { useEffect, useState } from "react"
import ArrowUpIcon from '@assets/arrowUp.svg'
import ArrowDownIcon from '@assets/arrowDown.svg'
import CodeIcon from '@assets/code.svg'
import { useSocket } from '@utils/useSocket'

function currentTime(): string {
    const date = new Date()
    const pad = (num: number, size = 2) => num.toString().padStart(size, '0')
  
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
    const milliseconds = pad(date.getMilliseconds(), 3)
  
    return `${hours}:${minutes}:${seconds}.${milliseconds}`
}


export function SocketMessages() {
    const socket = useSocket("wss://echo.websocket.org", { autoConnect: true })
    const [state, setState] = useState<Message[]>([])

    socket.useTypeMessage('hi', (message) => {
        console.log(message)
    })

    useEffect(() => {
        setState((v) => [
            ...v,
            {
                type: 'verbose',
                time: currentTime(),
                value: 'websocket status ' + socket.status
            }
        ])
    }, [socket.status])

    socket.useMessage((message) => {
        setState((v) => [
            ...v,
            {
                type: 'in',
                time: currentTime(),
                value: message
            }
        ])
    })

    const sendHi = () => {
        const message = { type: 'hi' }
        socket.sendJSON(message)

        setState((v) => [
            ...v,
            {
                type: 'out',
                time: currentTime(),
                value: JSON.stringify(message)
            }
        ])
    }

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