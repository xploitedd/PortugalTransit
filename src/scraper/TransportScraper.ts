import fs from 'fs'
import path from 'path'
import fetch, { RequestInit } from 'node-fetch'
import cheerio from 'cheerio'
import EventEmitter from 'events'
import Twitter from '../twitter/Twitter';
import { DateTime } from 'luxon'
import Emails from '../emails';
import redis from 'redis'
import bluebird from 'bluebird'
import os from 'os'
import FormData from 'form-data'

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

    public static async getTranstejoStatus(zone: Zone): Promise<any> {
        try {
            const action = 'partidasAjax-submit'
            const partidasNonce = '02678738fb'

            let zoneId: number[]
            switch (zone.zoneName) {
                case 'Lisboa':
                    zoneId = [16, 8, 6, 5, 2, 10, 3, 15, 9]
                    break
                case 'Barreiro':
                    zoneId = [16]
                    break
                case 'Montijo':
                    zoneId = [2]
                    break
                case 'Almada':
                    zoneId = [9, 10, 6]
                    break
                case 'Seixal':
                    zoneId = [3]
                    break
            }

            const tFreq: { [key: number]: string } = {}
            const lines: { [key: number]: SystemType } = {}
            for (const id in zoneId) {
                const form = new FormData()
                form.append('action', action)
                form.append('partidasNonce', partidasNonce)
                form.append('terminal', id)

                const info = await zone.getInformation(TransportType.FERRY, { method: 'POST', body: form })
                if (info === '-1')
                    return Promise.reject('Error fetching: please check if the nonce is valid!')
                
                const status = JSON.parse(info)['html']
                if (typeof status !== 'string')
                    return Promise.reject('Error fetching: status is not a string')

                const obj = Zone.getCheerioObject(status)
                obj('.tablePartidas tr').each((i, elem) => {
                    if (i % 2 === 1 && i !== 0) {
                        const cl = elem.attribs.class
                        const routeId: number = TransportScraper.getFerryLine(cl, true)
                        const routeName: string = TransportScraper.getFerryLine(cl)
                        const children: any[] = elem.children
                        if (lines[routeId]) {
                            const tempFreq = tFreq[routeId]
                            if (tempFreq) {
                                const splittedFreqOld = tempFreq.split(':')
                                const hourOld = parseInt(splittedFreqOld[0])
                                const minuteOld = parseInt(splittedFreqOld[1])
    
                                const splittedFreqNew = children[0].children[0].data.split(':')
                                const hourNew = parseInt(splittedFreqNew[0])
                                const minuteNew = parseInt(splittedFreqNew[1])
    
                                const hourDiff = hourNew - hourOld
                                const frequency = minuteNew - minuteOld + 60 * hourDiff
                                lines[routeId].routeFrequency = `${frequency}m`
                                tFreq[routeId] = undefined
                            }
                        } else {
                            const stops: string[] = [ children[1].children[0].data, children[2].children[0].data ]
                            const tempFreq: string = children[0].children[0].data
                            tFreq[routeId] = tempFreq
                            lines[routeId] = {
                                routeId: Object.keys(lines).length,
                                routeName,
                                routeFrequency: 'N/A',
                                stops
                            }
                        }
                    }
                })
            }

            const finalLines: SystemType[] = []
            for (const l in lines)
                finalLines.push(lines[l])

            return finalLines
        } catch (err) {
            return Promise.reject(err)
        }
    }

    private static getFerryLine(shortName: string, getIndex?: boolean): any {
        switch (shortName) {
            case 'linhaLaranja':
                return getIndex ? 1 : 'Linha Laranja'
            case 'linhaAzul':
                return getIndex ? 2 : 'Linha Azul'
            case 'linhaAmarela':
                return getIndex ? 3 : 'Linha Amarela'
            case 'linhaRosa':
                return getIndex ? 4 : 'Linha Rosa'
            case 'linhaVerde':
                return getIndex ? 5 : 'Linha Verde'
            default:
                return null
        }
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
            if (twitter) {
                if ((zoneName === 'Lisboa' || zoneName === 'Porto') && transportId === 1)
                    this.postToTwitter(transportId)
            }
        })

        const updateCacheMS = updateCacheMin * 60000
        this.updateCache()
        setInterval(() => this.updateCache(), updateCacheMS)

        zones[zoneName] = this
    }

    public abstract async getTwitterInfo(type: TransportType, lineNumber: number): Promise<string | boolean>

    public abstract async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any>

    public async postToTwitter(type: TransportType) {
        try {
            const newCache = await this.getCache(type)
            for (let i = 0; i < newCache.length; ++i) {
                const twitterInfo: string | boolean = await this.getTwitterInfo(type, i)
                await this.twitter.req('statuses/update', { method: 'POST', formData: { status: `${twitterInfo}\n#(server id: ${os.hostname})` } })
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
            const redisClient = this.redisClient
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
            this.mail.sendErrorEmail(err)
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

export enum TransportType {
    FERRY, SUBWAY, BUS
}

export interface SystemType {
    routeName: string
    routeId: string | number
    routeFrequency?: string | number
    status?: { [key: string]: any }
    timeTable?: { [key: string]: string }
    stops?: string[]
}