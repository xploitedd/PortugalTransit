import fs from 'fs'
import path from 'path'
import request from 'request'
import cheerio from 'cheerio'

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
        switch(str) {
            case 'SUBWAY':
                return TransportType.SUBWAY
            case 'BUS':
                return TransportType.BUS
            case 'FERRY':
                return TransportType.FERRY
            default: 
                return undefined
        }
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

export abstract class Zone {
    public zoneName: string
    public transports: { [key: number]: string }

    constructor(zoneName: string, transports: { [key: number]: string }) {
        this.zoneName = zoneName
        this.transports = transports

        zones[zoneName] = this
    }

    public abstract parseInformation(type: TransportType): any

    protected async getInformation(type: TransportType, options?: request.CoreOptions) {
        const requestUrl = this.transports[type]
        return new Promise((resolve, reject) => {
            if (!requestUrl)
                return reject(`This transport method doesn't exist for the specified zone`)

            request(requestUrl, options, (err, req, body) => {
                if (err || req.statusCode !== 200)
                    return reject(`${err | req.statusCode}`)

                resolve(body)
            })
        })
    }

    protected getCheerioObject(body: any): CheerioStatic {
        if (typeof body !== 'string') 
            return null

        return cheerio.load(body)
    }
}

export enum TransportType {
    FERRY, SUBWAY, BUS
}

export type MetroType = {
    fullName: string,
    status: { [key: string]: any },
    trainFrequency: string
}