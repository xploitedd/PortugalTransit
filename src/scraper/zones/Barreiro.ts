import FormData from 'form-data';
import { TransportType, Zone } from '../TransportScraper';

export class Barreiro extends Zone {
    constructor() {
        super('Barreiro', { 
            [TransportType.BUS]: 'http://www.tcbarreiro.pt/realtime',
        })
    }

    public async getTwitterInfo(type: TransportType): Promise<string | boolean> { return false }

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        if (this.cache[type] && !forceUpdate)
            return this.cache[type]

        try {
            const form: FormData = new FormData()
            form.append('getVehicles', 'true')

            const body: string = await this.getInformation(type, { method: 'POST', body: form })
            const res = JSON.parse(body)
            
            return res
        } catch (err) {
            return Promise.reject(err)
        }
    }
}