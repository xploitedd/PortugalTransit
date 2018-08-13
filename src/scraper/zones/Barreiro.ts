import FormData from 'form-data';
import { TransportType, Zone } from '../TransportScraper';
import Twitter from '../../twitter/Twitter';
import Emails from '../../emails';
import redis from 'redis'

export class Barreiro extends Zone {
    constructor(twitter: Twitter, mail: Emails, redisClient: redis.RedisClient) {
        super('Barreiro', { 
            [TransportType.BUS]: 'http://www.tcbarreiro.pt/realtime',
        }, twitter, mail, redisClient)
    }

    public async getTwitterInfo(type: TransportType): Promise<string | boolean> { return false }

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        try {
            const cache = await this.getCache(type)
            if (cache && !forceUpdate)
                return cache

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