import TransportScraper, { TransportType } from '../TransportScraper';
import Zone from '../Zone'

export class Almada extends Zone {
    constructor() {
        super('Almada', {
            [TransportType.FERRY]: 'http://www.transtejo.pt/wp-admin/admin-ajax.php'
        })
    }

    public async getTwitterInfo(type: TransportType): Promise<string | boolean> { return false }

    protected async getSubwayStatus(): Promise<any> {}

    protected async getFerryStatus(): Promise<any> {
        try {
            const res = await TransportScraper.getTranstejoStatus(this)
            return res
        } catch (err) {
            return Promise.reject(err)
        }
    }

    protected async getBusStatus(): Promise<any> {}
}