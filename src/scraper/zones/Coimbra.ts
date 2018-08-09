import { TransportType, Zone, SystemType } from '../TransportScraper'

export class Coimbra extends Zone {
    constructor() {
        super('Coimbra', { 
            [TransportType.BUS]: 'http://coimbra.move-me.mobi/Lines/GetLines?providerName=SMTUC',
        })
    }

    public async getTwitterInfo(type: TransportType): Promise<string | boolean> { return false }

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        if (this.cache[type] && !forceUpdate)
            return this.cache[type]

        try {
            const body: string = await this.getInformation(type)
            const json = JSON.parse(body)
            const length = Object.keys(json).length
            const stops: SystemType[] = []
            for (let i = 0; i < length; ++i) {
                const stop = json[i]
                const routeId = stop.Key
                const routeName = stop.Value

                stops[i] = {
                    routeId,
                    routeName
                }
            }

            return stops
        } catch (err) {
            return Promise.reject(err)
        }
    }
}