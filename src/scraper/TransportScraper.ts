import fs from 'fs'
import path from 'path'
import fetch, { RequestInit } from 'node-fetch'
import cheerio from 'cheerio'
import EventEmitter from 'events'
import Twitter from '../twitter/Twitter';

const zones: { [key: string]: Zone } = {}
let twitter: Twitter
export class TransportScraper {
    constructor(tw: Twitter) {
        TransportScraper.loadZones()
        twitter = tw
    }

    public getZone(zoneName: string): Zone {
        zoneName = TransportScraper.capitalizeFirst(zoneName)
        if (zones[zoneName])
            return zones[zoneName]

        return undefined
    }

    public static convertStringToType(str: string): TransportType {
        str = str.toUpperCase()
        return (<any>TransportType)[str]
    }

    private static loadZones() {
        let zoneLoading: { [key: string]: any } = {}
        const folder = fs.readdirSync(path.join(__dirname, 'zones'))
        folder.forEach(fileName => {
            const splitted = fileName.split('.')
            const zname = splitted[0]
            const ext = splitted[splitted.length - 1]

            if (ext !== 'js')
                return
            
            zoneLoading[zname] = require(path.join(__dirname, 'zones', fileName))[zname]
            zones[zname] = new zoneLoading[zname]();
        })

        zoneLoading = {}
    }

    private static capitalizeFirst(str: string): string {
        str = str.toLowerCase()
        return str.charAt(0).toUpperCase() + str.slice(1)
    }
}

export abstract class Zone extends EventEmitter {
    public zoneName: string
    public transports: { [key: number]: string }
    protected cache: { [key: number]: SystemType[] } = {}

    constructor(zoneName: string, transports: { [key: number]: string }, updateCacheMin: number = 2) {
        super()

        this.zoneName = zoneName
        this.transports = transports

        this.on('cacheChange', (zoneName, transportId, lastCache) => {
            console.log(`[${new Date().toISOString()}][Cache] Updating zone ${zoneName} - ${TransportType[transportId]}`)
            if ((zoneName === 'Lisbon' || zoneName === 'Porto') && transportId === 1 && lastCache)
                this.postToTwitter(transportId, lastCache)
        })

        const updateCacheMS = updateCacheMin * 60000
        this.updateCache()
        setInterval(() => this.updateCache(), updateCacheMS)

        zones[zoneName] = this
    }

    public async postToTwitter(type: TransportType, lastCache: SystemType[]) {
        try {
            const newCache = this.cache[type]
            for (let i = 0; i < lastCache.length; ++i) {
                const ncache = newCache[i]
                const ncacheStatus = ncache.status.code
                const ncacheFreq = ncache.routeFrequency

                const lcache = lastCache[i]
                const lcacheStatus = lcache.status.code
                const lcacheFreq = lcache.routeFrequency

                const twitterInfo: string | boolean = await this.getTwitterInfo(type, i)
                if ((lcacheStatus === 1 && ncacheStatus !== 1) || (ncacheFreq !== lcacheFreq))
                    twitter.req('statuses/update', { method: 'POST', formData: { status: twitterInfo } })
            }  
        } catch (err) {
            console.error(err)
        }
    }

    public async updateCache() {
        try {
            for (const transport in this.transports) {
                const transportId = parseInt(transport)
                if (!isNaN(transportId)) {
                    const newCache: SystemType[] = await this.parseInformation(transportId, true)
                    if (!this.cache[transportId] || JSON.stringify(newCache) !== JSON.stringify(this.cache[transportId]))
                    {
                        const lastCache: SystemType[] = this.cache[transportId]
                        this.cache[transportId] = newCache
                        this.emit('cacheChange', this.zoneName, transportId, lastCache)
                    }
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    public abstract async getTwitterInfo(type: TransportType, lineNumber: number): Promise<string | boolean>

    public abstract async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any>

    protected async getInformation(type: TransportType, options?: RequestInit): Promise<string> {
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
            return Promise.reject(err)
        }
    }

    protected getCheerioObject(body: string): CheerioStatic {
        return cheerio.load(body)
    }
}

export enum TransportType {
    FERRY, SUBWAY, BUS
}

export interface SystemType {
    routeName: string
    routeId: string | number
    routeFrequency?: string | number
    status?: { [key: string]: any }
    timeTable?: { [key: string]: string }
    stops?: { [key: string]: string }
}