import './App.style.scss'
import { array, clamp, Point } from '@utils/std'
import { useState } from '@utils/useState'
import { Stage, Layer, Rect } from 'react-konva'
import { cloneElement, useRef } from 'react'
import { RectConfig } from 'konva/lib/shapes/Rect'
import { KonvaEventObject, Node, NodeConfig } from 'konva/lib/Node'

const GRID_SIZE = 9
const CELL_SIZE = 30

const cells = array(GRID_SIZE).map((y) => (
    array(GRID_SIZE).map((x) => (
        <Rect
            key={y + '-' + x}
            x={x * CELL_SIZE + 1}
            y={y * CELL_SIZE + 1}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill="transparent"
            stroke="black"
            strokeWidth={2}
            listening={false}
        />
    ))
))

interface LineResult {
    x: number
    y: number
    fill: ("hor" | "ver" | "dialL" | "dialR")[]
    player: "paintP1" | "paintP2"
    pointsToHardPaint: string[];
}

interface Triple {
    points: string[]; // Массив координат точек в тройке
    directions: string[]; // Направления тройки
    center: string; // Центральная точка тройки
}

export function App() {
    const grid = useState(cells)
    const lastCell = useRef<number[]>([])
    const gridData = useRef<Point[]>([])


    // Изменение цвета клетки
    const updateSpecificCell = (x: number, y: number) => { 
        const point = gridData.current.find(p => p.x === x && p.y === y);
        let fillColor = 'transparent';

        if (point) {
            switch (point.state) {
                case 'hitP1':
                    fillColor = 'yellow';
                    break;
                case 'hitP2':
                    fillColor = 'blue';
                    break;
                case 'paintP1':
                    fillColor = 'red';
                    break;
                case 'paintP2':
                    fillColor = 'lightcoral';
                    break;
                case 'hitPaintP1':
                    fillColor = 'green';
                    break;
                case 'hitPaintP2':
                    fillColor = 'darkred';
                    break;
                default:
                    fillColor = 'transparent';
            }
        }

        grid.set((v) => {
            const cell = v[y][x];
            const cellProps = cell.props as RectConfig;

            const newCell = cloneElement(cell, {
                ...cellProps,
                fill: fillColor
            });

            return [...v.map((vv, index) => index === y ? (vv.splice(x, 1, newCell), [...vv]) : vv)]
        })
    }

    // Заполнение полных линий
    const fillLines = (targetPlayer: string) => { 
        const matchedPoint: LineResult | null = checkTriples(targetPlayer)

        if(matchedPoint) {
            for (const dir of matchedPoint.fill) {
                //let block = true
                let x = matchedPoint.x
                let y = matchedPoint.y

                switch (dir) {
                    case 'hor':
                        while(x >= 0 && updateCell(x, y, matchedPoint.player, false)) {
                            x -= 1
                        }
                        x = matchedPoint.x
                        while(x < GRID_SIZE && updateCell(x, y, matchedPoint.player, false)) {
                            x += 1
                        }
                        break
                    case 'ver':
                        while(y >= 0 && updateCell(x, y, matchedPoint.player, false)) {
                            y -= 1
                        }
                        y = matchedPoint.y
                        while(y < GRID_SIZE && updateCell(x, y, matchedPoint.player, false)) {
                            y += 1
                        }
                        break
                    case 'dialL':
                        while(y >= 0 && x >= 0 && updateCell(x, y, matchedPoint.player, false)) {
                            x -= 1
                            y -= 1
                        }
                        x = matchedPoint.x
                        y = matchedPoint.y
                        while(y < GRID_SIZE && x < GRID_SIZE && updateCell(x, y, matchedPoint.player, false)) {
                            x += 1
                            y += 1
                        }
                        break
                    case 'dialR':
                        while(y >= 0 && x >= 0 && updateCell(x, y, matchedPoint.player, false)) {
                            x += 1
                            y -= 1
                        }
                        x = matchedPoint.x
                        y = matchedPoint.y
                        while(y < GRID_SIZE && x < GRID_SIZE && updateCell(x, y, matchedPoint.player, false)) {
                            x -= 1
                            y += 1
                        }
                        break
                }

                matchedPoint?.pointsToHardPaint.forEach(coord => {
                    const [x, y] = coord.split(',').map(Number)
                    updateCell(x, y, matchedPoint.player, true)
                })
            }
        }
    }

    // Изменение состояния клетки
    const updateCell = (x: number, y: number, state: "empty" | "hitP1" | "hitP2" | "paintP1" | "paintP2" | "hitPaintP1" | "hitPaintP2", hardUpdate: boolean) => { 
        if (x < 0 || x >= GRID_SIZE) return
        if (y < 0 || y >= GRID_SIZE) return

        const point = gridData.current.find(p => p.x === x && p.y === y);

        const invalidStatesMap: Record<string, string[]> = {
            empty: [],
            hitP1: ["hitP1", "hitPaintP1", "hitP2", "paintP2", "hitPaintP2"],
            hitP2: ["hitP2", "hitPaintP2", "hitP1", "paintP1", "hitPaintP1"],
            paintP1: ["hitP2", "hitPaintP2"],
            paintP2: ["hitP1", "hitPaintP1"],
            hitPaintP1: [],
            hitPaintP2: [],
        }

        if (point) {
            const invalidStates = invalidStatesMap[state];
            if (invalidStates && invalidStates.includes(point.state)) return false
        }
        else {
            gridData.current.push(new Point(x, y, state))

            updateSpecificCell(x, y)
            return true
        }

        if (point?.state == "paintP1" && state == "hitP1") {
            const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
            gridData.current[index] = new Point(x, y, "hitPaintP1")
        }
        else if (point?.state == "paintP2" && state == "hitP2") {
            const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
            gridData.current[index] = new Point(x, y, "hitPaintP2")
        }
        else if ((point?.state == "hitP1" || point?.state == "hitPaintP1") && state == "paintP1") {
            if (hardUpdate) {
                const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
                gridData.current[index] = new Point(x, y, "paintP1")
            }
            else {
                const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
                gridData.current[index] = new Point(x, y, "hitPaintP1")
            }
        }
        else if (point?.state == "paintP2" && state == "paintP1") {
            const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
                gridData.current[index] = new Point(x, y, "paintP1")
        }
        else if ((point?.state == "hitP2" || point?.state == "hitPaintP2") && state == "paintP2") {
            if (hardUpdate) {
                const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
                gridData.current[index] = new Point(x, y, "paintP2")
            }
            else {
                const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
                gridData.current[index] = new Point(x, y, "hitPaintP2")
            }
        }
        else if (point?.state == "paintP1" && state == "paintP2") {
            const index = gridData.current.findIndex(p => p.x === point.x && p.y === point.y)
                gridData.current[index] = new Point(x, y, "paintP2")
        }

        updateSpecificCell(x, y)

        return true
    }

    // Нажатие на клетку
    const fillOnClick = (e: KonvaEventObject<MouseEvent, Node<NodeConfig>>) => {
        const pointer = e.target.getRelativePointerPosition()
        if (!pointer) return

        const x = Math.floor(clamp(pointer.x - 1, 0) / CELL_SIZE)
        const y = Math.floor(clamp(pointer.y - 1, 0) / CELL_SIZE)
        
        if (x < 0 || x >= GRID_SIZE) return
        if (y < 0 || y >= GRID_SIZE) return

        if (!e.evt.ctrlKey) {
            if (updateCell(x, y, "hitP1", false)) {
                console.log(gridData.current)
                console.log(checkTriples("hitP1"))

                fillLines("hitP1")
            }
        }
        else {
            if (updateCell(x, y, "hitP2", false)) {
                console.log(gridData.current)
                console.log(checkTriples("hitP2"))

                fillLines("hitP2")
            }
        }
    }

    // Проверяем соседей
    const checkTriples = (playerType: string): LineResult | null => {
        const pointSet = new Set<string>()

        const targetStates = playerType === "hitP1" 
            ? ["hitP1", "hitPaintP1"] 
            : ["hitP2", "hitPaintP2"]


        gridData.current.forEach(point => {
            if (targetStates.includes(point.state)) {
                pointSet.add(`${point.x},${point.y}`)
            }
        })

        const foundTriples: {
            points: string[]
            directions: string[]
            center: string
        }[] = []

        for (const point of gridData.current) {
            if (!targetStates.includes(point.state)) continue

            const {x, y} = point
            const currentPoint = `${x},${y}`
            const directions: string[] = []


            if (pointSet.has(`${x-1},${y}`) && pointSet.has(`${x+1},${y}`)) {
                directions.push("hor")
                foundTriples.push({
                    points: [`${x-1},${y}`, currentPoint, `${x+1},${y}`],
                    directions: ["hor"],
                    center: currentPoint
                })
            }
            if (pointSet.has(`${x},${y-1}`) && pointSet.has(`${x},${y+1}`)) {
                directions.push("ver")
                foundTriples.push({
                    points: [`${x},${y-1}`, currentPoint, `${x},${y+1}`],
                    directions: ["ver"],
                    center: currentPoint
                })
            }
            if (pointSet.has(`${x-1},${y-1}`) && pointSet.has(`${x+1},${y+1}`)) {
                directions.push("dialL")
                foundTriples.push({
                    points: [`${x-1},${y-1}`, currentPoint, `${x+1},${y+1}`],
                    directions: ["dialL"],
                    center: currentPoint
                })
            }
            if (pointSet.has(`${x+1},${y-1}`) && pointSet.has(`${x-1},${y+1}`)) {
                directions.push("dialR")
                foundTriples.push({
                    points: [`${x+1},${y-1}`, currentPoint, `${x-1},${y+1}`],
                    directions: ["dialR"],
                    center: currentPoint
                })
            }
        }

        if (foundTriples.length === 0) return null

        const allPointsToHardPaint = new Set<string>()
        foundTriples.forEach(triple => {
            triple.points.forEach(point => allPointsToHardPaint.add(point))
        })

        const pointCount = new Map<string, {count: number, directions: Set<string>}>()
        
        for (const triple of foundTriples) {
            for (const point of triple.points) {
                if (!pointCount.has(point)) {
                    pointCount.set(point, {count: 0, directions: new Set()})
                }
                const data = pointCount.get(point)!
                data.count++
                triple.directions.forEach(dir => data.directions.add(dir))
            }
        }

        const sortedPoints = Array.from(pointCount.entries())
            .sort((a, b) => {
                if (b[1].count !== a[1].count) {
                    return b[1].count - a[1].count
                }
                return b[1].directions.size - a[1].directions.size
            }
        )

        const bestPoint = sortedPoints[0][0]
        const [x, y] = bestPoint.split(',').map(Number)
        const directions = Array.from(pointCount.get(bestPoint)!.directions) as ("hor" | "ver" | "dialL" | "dialR")[];

        return {
            x,
            y,
            fill: directions,
            player: playerType === "hitP1" ? "paintP1" : "paintP2",
            pointsToHardPaint: Array.from(allPointsToHardPaint)
        }
    }

    return (
        <div className="container">
            <Stage
                width={272}
                height={272}
                //onMouseMove={layerMouseMove}
                onClick={fillOnClick}
            >
                <Layer>
                    {grid.value}
                </Layer>
            </Stage>
        </div>
    )
}
