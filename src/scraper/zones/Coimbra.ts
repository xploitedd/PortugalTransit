import TransportScraper, { TransportType, SystemType } from '../TransportScraper';
import Zone from '../Zone'

export class Coimbra extends Zone {
    constructor() {
        super('Coimbra', { 
            [TransportType.BUS]: 'http://coimbra.move-me.mobi/Lines/GetLines?providerName=SMTUC',
        })
    }

    public async getTwitterInfo(type: TransportType): Promise<string | boolean> { return false }

    protected async getSubwayStatus(): Promise<any> {}

    protected async getFerryStatus(): Promise<any> {}

    protected async getBusStatus(): Promise<any> {
        try {
            const body: string = await this.getInformation(TransportType.BUS)
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