import fs from 'fs'
import path from 'path'
import fetch, { RequestInit } from 'node-fetch'
import cheerio from 'cheerio'
import EventEmitter from 'events'
import Twitter from '../twitter/Twitter';
import { DateTime } from 'luxon'
import Emails from '../emails';
import redis from 'redis'
import { promisify } from 'util'
import os from 'os'

const zones: { [key: string]: Zone } = {}
export class TransportScraper {
    private twitter: Twitter
    private mail: Emails
    private redisClient: redis.RedisClient

    constructor(twitter: Twitter, mail: Emails, redisClient: redis.RedisClient) {
        this.twitter = twitter
        this.mail = mail
        this.redisClient = redisClient

        this.loadZones()
    }

    public getZone(zoneName: string): Zone {
        zoneName = TransportScraper.capitalizeFirst(zoneName)
        if (zones[zoneName])
            return zones[zoneName]

        return undefined
    }

    private loadZones() {
        let zoneLoading: { [key: string]: any } = {}
        const folder = fs.readdirSync(path.join(__dirname, 'zones'))
        folder.forEach(fileName => {
            const splitted = fileName.split('.')
            const zname = splitted[0]
            const ext = splitted[splitted.length - 1]

            if (ext !== 'js')
                return
            
            zoneLoading[zname] = require(path.join(__dirname, 'zones', fileName))[zname]
            zones[zname] = new zoneLoading[zname](this.twitter, this.mail, this.redisClient);
        })

        zoneLoading = {}
    }

    public static convertStringToType(str: string): TransportType {
        str = str.toUpperCase()
        return (<any>TransportType)[str]
    }

    private static capitalizeFirst(str: string): string {
        str = str.toLowerCase()
        return str.charAt(0).toUpperCase() + str.slice(1)
    }
}

export abstract class Zone extends EventEmitter {
    public zoneName: string
    public transports: { [key: number]: string }
    protected timeZone: string
    protected twitter: Twitter
    protected mail: Emails
    protected redisClient: redis.RedisClient

    constructor(
        zoneName: string, 
        transports: { [key: number]: string }, 
        twitter: Twitter, 
        mail: Emails, 
        redisClient: redis.RedisClient,
        timeZone: string = 'Europe/Lisbon', 
        updateCacheMin: number = 2
    ) {
        super()

        this.zoneName = zoneName
        this.transports = transports
        this.timeZone = timeZone
        this.twitter = twitter
        this.mail = mail
        this.redisClient = redisClient

        this.on('cacheChange', (zoneName, transportId) => {
            console.log(`[${this.getDateInZone()}][Cache] Updating zone ${zoneName} - ${TransportType[transportId]}`)
            if ((zoneName === 'Lisboa' || zoneName === 'Porto') && transportId === 1)
                this.postToTwitter(transportId)
        })

        const updateCacheMS = updateCacheMin * 60000
        this.updateCache()
        setInterval(() => this.updateCache(), updateCacheMS)

        zones[zoneName] = this
    }

    public async postToTwitter(type: TransportType) {
        try {
            const newCache = await this.getCache(type)
            for (let i = 0; i < newCache.length; ++i) {
                const twitterInfo: string | boolean = await this.getTwitterInfo(type, i)
                await this.twitter.req('statuses/update', { method: 'POST', formData: { status: `${twitterInfo}\n#id(${os.hostname})` } })
            }
        } catch (err) {
            this.mail.sendErrorEmail(err.message)
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
                    console.log(JSON.stringify(await this.getCache(1)))
                    console.log(JSON.stringify(await this.parseInformation(1, true)))
                    if (!cache || JSON.stringify(newCache) !== JSON.stringify(cache))
                    {
                        this.redisClient.set(`${this.zoneName}_${transportId}`, JSON.stringify(newCache))
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
            const getAsync = promisify(this.redisClient.get).bind(this.redisClient)
            const cache = await getAsync(`${this.zoneName}_${type}`)
            return JSON.parse(cache)
        } catch (err) {
            return Promise.reject(err)
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
            this.mail.sendErrorEmail(err)
            return Promise.reject(err)
        }
    }

    protected getCheerioObject(body: string): CheerioStatic {
        return cheerio.load(body)
    }

    protected getDateInZone() {
        return DateTime.local().setZone(this.timeZone).toFormat(`dd'/'LL'/'yy HH'h:'mm'm'`)
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