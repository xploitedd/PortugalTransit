import fs from 'fs'
import path from 'path'
import fetch, { RequestInit } from 'node-fetch'
import cheerio from 'cheerio'
import EventEmitter from 'events'

const zones: { [key: string]: Zone } = {}
export class TransportScraper {
    constructor() {
        TransportScraper.loadZones()
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
    protected cache: { [key: number]: (SubwayType | BusType | any)[] } = {} // remove any in the future

    constructor(zoneName: string, transports: { [key: number]: string }, updateCacheMin: number = 2) {
        super()

        this.zoneName = zoneName
        this.transports = transports

        this.on('cacheChange', (zoneName, transportId) => 
            console.log(`[${new Date().toISOString()}][Cache] Updating zone ${zoneName} - ${TransportType[transportId]}`))

        const updateCacheMS = updateCacheMin * 60000
        this.updateCache()
        setInterval(() => this.updateCache(), updateCacheMS)

        zones[zoneName] = this
    }

    public async updateCache() {
        try {
            for (const transport in this.transports) {
                const transportId = parseInt(transport)
                if (!isNaN(transportId)) {
                    const newCache: (SubwayType | BusType | any)[] = await this.parseInformation(transportId, true) // remove any in the future
                    if (!this.cache[transportId] || newCache.toString() !== this.cache[transportId].toString())
                    {
                        this.emit('cacheChange', this.zoneName, transportId)
                        this.cache[transportId] = newCache
                    }
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

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

export type SubwayType = {
    fullName: string,
    status: { [key: string]: any },
    trainFrequency: string
}

export type BusType = {
    stopId: string,
    stopName: string,
    timeTable: { [key: string]: string }
}