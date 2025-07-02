import { app } from '.'

app.get('/', (res, req) => {
    res.end('hello san')
})