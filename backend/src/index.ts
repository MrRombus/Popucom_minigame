import { App as uServer } from 'uWebSockets.js'
import { config } from './config'

export const app = uServer()

import './controller.http'
import './controller.sockets'

app.listen(config.PORT, () => {
    console.log('server started on port ' + config.PORT)
})

process.on("uncaughtException", console.error)