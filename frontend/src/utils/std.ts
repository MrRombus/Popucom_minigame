export function array(length: number) {
    return [...Array(length).keys()]
}

export function clamp(value: number, min: number, max?: number) {
    return Math.max(min, max != null ? Math.min(value, max) : value)
}

export class Point {
    x: number
    y: number
    state: "empty" | "hitP1" | "hitP2" | "paintP1" | "paintP2" | "hitPaintP1" | "hitPaintP2"

    constructor(x: number, y: number, state: "empty" | "hitP1" | "hitP2" | "paintP1" | "paintP2" | "hitPaintP1" | "hitPaintP2") {
        this.x = x
        this.y = y
        this.state = state
    }
}

export class Deferred<T> {
    promise: Promise<T>
    resolve!: (value: T) => void
    reject!: (reason?: any) => void

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }
}