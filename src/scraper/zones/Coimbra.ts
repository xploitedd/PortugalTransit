import { TransportType, Zone, BusType } from '../TransportScraper'

export class Coimbra extends Zone {
    constructor() {
        super('Coimbra', { 
            [TransportType.BUS]: 'http://smtuc.pt/api/horariostempos/',
        })
    }

    public async getTwitterInfo(type: TransportType): Promise<string[] | boolean> { return false }

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        if (this.cache[type] && !forceUpdate)
            return this.cache[type]

        try {
            const body: string = await this.getInformation(type)
            const json = JSON.parse(body)
            const length = Object.keys(json).length
            const stops: BusType[] = []
            for (let i = 0; i < length; ++i) {
                const stop = json[i]
                const stopId = stop.id_h
                const stopName = stop.LOCAL
                const timeTable: { [key: string] : string } = {}

                if (stop.tempos1)
                    timeTable['WORKING_DAYS'] = stop.tempos1

                if (stop.tempos2)
                    timeTable['SATURDAY'] = stop.tempos2

                if (stop.tempos3)
                    timeTable['SUNDAY_AND_HOLIDAYS'] = stop.tempos3

                stops[i] = {
                    stopId,
                    stopName,
                    timeTable
                }
            }

            return stops
        } catch (err) {
            return Promise.reject(err)
        }
    }
}