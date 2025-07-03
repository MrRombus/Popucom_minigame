import './App.style.scss'
import { array, clamp } from '@utils/std'
import { useState } from '@utils/useState'
import { Stage, Layer, Rect } from 'react-konva'
import { cloneElement, useRef } from 'react'
import { RectConfig } from 'konva/lib/shapes/Rect'
import { KonvaEventObject, Node, NodeConfig } from 'konva/lib/Node'

const GRID_SIZE = 20
const CELL_SIZE = 30

const cells = array(GRID_SIZE).map((row) => (
    array(GRID_SIZE).map((col) => (
        <Rect
            key={row + '-' + col}
            x={col * CELL_SIZE + 1}
            y={row * CELL_SIZE + 1}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill="transparent"
            stroke="black"
            strokeWidth={2}
            listening={false}
        />
    ))
))

export function App() {
    const grid = useState(cells)
    const lastCell = useRef<number[]>([])

    const updateSpecificCell = (row: number, col: number, fill: string) => {
        grid.set((v) => {
            const cell = v[row][col]
            const cellProps = cell.props as RectConfig

            const newCell = cloneElement(cell, {
                ...cellProps,
                fill: fill
            })

            return [...v.map((vv, index) => index == row ? (vv.splice(col, 1, newCell), [...vv]) : vv)]
        })
    }

    const layerMouseMove = (e: KonvaEventObject<MouseEvent, Node<NodeConfig>>) => {
        const pointer = e.target.getRelativePointerPosition()
        const lcell = lastCell.current
        if (lcell.length) updateSpecificCell(lcell[0], lcell[1], 'transparent')
        if (!pointer) return

        const row = Math.floor(clamp(pointer.y - 1, 0) / CELL_SIZE)
        const col = Math.floor(clamp(pointer.x - 1, 0) / CELL_SIZE)
        
        if (row < 0 || row >= GRID_SIZE) return
        if (col < 0 || col >= GRID_SIZE) return

        lastCell.current = [row, col]
        updateSpecificCell(row, col, 'yellow')
    }

    return (
        <div className="container">
            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseMove={layerMouseMove}
            >
                <Layer>
                    {grid.value}
                </Layer>
            </Stage>
        </div>
    )
}
