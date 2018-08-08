import { TransportType, Zone, MetroType } from '../TransportScraper'

export class Barreiro extends Zone {
    constructor() {
        super('Barreiro', { 
            [TransportType.BUS]: 'http://www.tcbarreiro.pt/realtime',
        })
    }

    public parseInformation(type: TransportType) {
        return new Promise((resolve, reject) => {
            this.getInformation(type, { method: 'POST', form: { getVehicles: true } }).then((body: string) => {
                resolve(JSON.parse(body))
            }).catch(reject)
        })
    }
}