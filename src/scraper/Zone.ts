import bluebird from 'bluebird'
import os from 'os'
import { DateTime } from 'luxon'
import cheerio from 'cheerio'
import EventEmitter from 'events'
import TransportScraper, { SystemType, TransportType } from './TransportScraper'
import fetch, { RequestInit } from 'node-fetch'

export default abstract class Zone extends EventEmitter {
    public zoneName: string
    public transports: { [key: number]: string }
    protected timeZone: string

    constructor(zoneName: string, transports: { [key: number]: string }, timeZone: string = 'Europe/Lisbon', updateCacheMin: number = 2) {
        super()

        this.zoneName = zoneName
        this.transports = transports
        this.timeZone = timeZone

        this.on('cacheChange', (zoneName, transportId) => {
            console.log(`[${this.getDateInZone()}][Cache] Updating zone ${zoneName} - ${TransportType[transportId]}`)
            if (TransportScraper.twitter) {
                if ((zoneName === 'Lisboa' || zoneName === 'Porto') && transportId === 1)
                    this.postToTwitter(transportId)
            }
        })

        const updateCacheMS = updateCacheMin * 60000
        this.updateCache()
        setInterval(() => this.updateCache(), updateCacheMS)

        TransportScraper.zones[zoneName] = this
    }

    public abstract async getTwitterInfo(type: TransportType, lineNumber: number): Promise<string | boolean>

    protected abstract async getFerryStatus(): Promise<any>

    protected abstract async getBusStatus(): Promise<any>

    protected abstract async getSubwayStatus(): Promise<any>

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        try {
            if (!this.transports[type])
                return Promise.reject('That type does not exist in the specified zone')

            const cache = await this.getCache(type)
            if (cache && !forceUpdate)
                return cache

            switch(type) {
                case TransportType.SUBWAY:
                    return await this.getSubwayStatus()
                case TransportType.FERRY:
                    return await this.getFerryStatus()
                case TransportType.BUS:
                    return await this.getBusStatus()
            }
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async postToTwitter(type: TransportType) {
        try {
            const newCache = await this.getCache(type)
            for (let i = 0; i < newCache.length; ++i) {
                const twitterInfo: string | boolean = await this.getTwitterInfo(type, i)
                await TransportScraper.twitter.req('statuses/update', { method: 'POST', formData: { status: `${twitterInfo}\n#(server id: ${os.hostname})` } })
            }
        } catch (err) {
            TransportScraper.mail.sendErrorEmail(err.message)
            console.error(err)
        }
    }

    public async updateCache() {
        try {
            for (const transport in this.transports) {
                const transportId = parseInt(transport)
                if (!isNaN(transportId)) {
                    const cache = await this.getCache(transportId)
                    const newCache: SystemType[] = await this.parseInformation(transportId, true)
                    if (!cache || JSON.stringify(newCache) !== JSON.stringify(cache))
                    {
                        TransportScraper.redisClient.set(`${this.zoneName}_${transportId}`, JSON.stringify(newCache))
                        this.emit('cacheChange', this.zoneName, transportId)
                    }
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    public async getCache(type: TransportType): Promise<SystemType[]> {
        try {
            const redisClient = TransportScraper.redisClient
            const getAsync = bluebird.promisify(redisClient.get, { context: redisClient })
            const cache = await getAsync(`${this.zoneName}_${type}`)
            return JSON.parse(cache)
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async getInformation(type: TransportType, options?: RequestInit): Promise<string> {
        try {
            const requestUrl = this.transports[type]
            const res = await fetch(requestUrl, options)
            if (res.status !== 200) 
                return Promise.reject(`Error Fetching: status code ${res.status}`)

            const body = await res.text()
            if (typeof body !== 'string')
                return Promise.reject(`Error Fetching: body is not a string`)

            return body
        } catch (err) {
            TransportScraper.mail.sendErrorEmail(err)
            return Promise.reject(err)
        }
    }

    protected getDateInZone() {
        return DateTime.local().setZone(this.timeZone).toFormat(`dd'/'LL'/'yy HH'h:'mm'm'`)
    }

    public static getCheerioObject(body: string): CheerioStatic {
        return cheerio.load(body)
    }
}