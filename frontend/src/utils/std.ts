export function array(length: number) {
    return [...Array(length).keys()]
}

export function clamp(value: number, min: number, max?: number) {
    return Math.max(min, max != null ? Math.min(value, max) : value)
}

export class Point {
    x: number
    y: number

    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }
}