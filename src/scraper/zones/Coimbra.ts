import { TransportType, Zone, SystemType } from '../TransportScraper'
import Twitter from '../../twitter/Twitter';
import Emails from '../../emails';
import redis from 'redis'

export class Coimbra extends Zone {
    constructor(twitter: Twitter, mail: Emails, redisClient: redis.RedisClient) {
        super('Coimbra', { 
            [TransportType.BUS]: 'http://coimbra.move-me.mobi/Lines/GetLines?providerName=SMTUC',
        }, twitter, mail, redisClient)
    }

    public async getTwitterInfo(type: TransportType): Promise<string | boolean> { return false }

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        try {
            const cache = await this.getCache(type)
            if (cache && !forceUpdate)
                return cache

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