import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import Twitter from '../twitter/Twitter';
import Emails from '../emails';
import redis from 'redis'
import FormData from 'form-data'
import Zone from './Zone'

export default class TransportScraper {
    public static zones: { [key: string]: Zone } = {}
    public static twitter: Twitter
    public static mail: Emails
    public static redisClient: redis.RedisClient

    constructor(twitter: Twitter, mail: Emails, redisClient: redis.RedisClient) {
        TransportScraper.twitter = twitter
        TransportScraper.mail = mail
        TransportScraper.redisClient = redisClient

        this.loadZones()
    }

    public getZone(zoneName: string): Zone {
        zoneName = TransportScraper.capitalizeFirst(zoneName)
        if (TransportScraper.zones[zoneName])
            return TransportScraper.zones[zoneName]

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
            TransportScraper.zones[zname] = new zoneLoading[zname]();
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
            const pfetch = await fetch('http://www.transtejo.pt/')
            const body = await pfetch.text()
            const pobj = Zone.getCheerioObject(body)
            const info = JSON.parse(pobj('script')[14].children[0].data.substring(36, 145))

            const action = 'partidasAjax-submit'
            const partidasNonce = info.partidasNonce

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
            for (const i in zoneId) {
                const form = new FormData()
                form.append('action', action)
                form.append('partidasNonce', partidasNonce)
                form.append('terminal', zoneId[i])

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
                            if (tempFreq && lines[routeId].stops[0] === children[1].children[0].data) {
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