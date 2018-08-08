import os from 'os'
import restify from 'restify'
import { TransportType, TransportScraper, Zone, MetroType } from './scraper/TransportScraper'

export class WebServer {
    constructor() {
        const server = restify.createServer()
        const Transports = new TransportScraper()

        server.use(restify.plugins.queryParser())

        server.get('/', (_, res, next) => {
            res.send({ message: `Server running on ${os.hostname()}` })
            return next()
        })

        server.get('/:zone/:type', (req, res, next) => {
            const zoneString: string = req.params.zone
            const typeString: string = req.params.type

            const zone: Zone = Transports.getZone(zoneString)
            if (!zone) {
                res.send({ message: `Incorrect Zone!` })
                return next()
            }

            const type: TransportType = TransportScraper.convertStringToType(typeString)
            if (!type) {
                res.send({ message: `Incorrect Type!` })
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

        server.listen(3000, () => {
            console.log('Server is listening')
        })
    }
}