import os from 'os'
import restify from 'restify'
import { TransportType, TransportScraper, Zone } from './scraper/TransportScraper'

export default class WebServer {
    public static startWebServer(port: number, Transports: TransportScraper) {
        const server = restify.createServer()
        server.use(restify.plugins.queryParser())

        server.get('/', (_, res, next) => {
            res.send({ message: `Server running on ${os.hostname()}` })
            return next()
        })

        server.get('/:type/:zone', (req, res, next) => {
            const zoneString: string = req.params.zone
            const typeString: string = req.params.type

            const type: TransportType = TransportScraper.convertStringToType(typeString)
            if (!TransportType[type]) {
                res.send({ message: `Incorrect Type!` })
                return next()
            }

            const zone: Zone = Transports.getZone(zoneString)
            if (!zone) {
                res.send({ message: `Incorrect Zone!` })
                return next()
            }

            zone.parseInformation(type).then((lines: any) => {
                res.send(lines)
                return next()
            }).catch((err: any) => {
                res.send({ message: err })
                return next()
            })
        })

        server.listen(port, () => {
            console.log(`[Web] Server is up on port ${port}`)
        })
    }
}