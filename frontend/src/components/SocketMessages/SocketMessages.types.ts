export interface Message {
    type: MessageType
    time: string
    value: string
}

export type MessageType =
    | 'in'
    | 'out'
    | 'verbose'