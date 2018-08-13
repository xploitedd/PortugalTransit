import { TransportType, Zone, SystemType } from '../TransportScraper'
import Twitter from '../../twitter/Twitter';
import Emails from '../../emails';
import redis from 'redis'

export class Lisboa extends Zone {
    constructor(twitter: Twitter, mail: Emails, redisClient: redis.RedisClient) {
        super('Lisboa', { 
            [TransportType.SUBWAY]: 'https://www.metrolisboa.pt/wp-admin/admin-ajax.php?action=estado_linhas_ajax_action',
        }, twitter, mail, redisClient)
    }

    public async getTwitterInfo(type: TransportType, lineNumber: number): Promise<string | boolean> {
        try {
            const info: SystemType[] = await this.parseInformation(type)
            const si: SystemType = info[lineNumber]

            const patMsg = `Local: ${this.zoneName} - ${si.routeName}\nStatus: `
            switch(si.status.code) {
                case 0: 
                    return `${patMsg}😡 ${si.status.message}`
                case 1:
                    return `${patMsg}😄 ${si.status.message}\nFrequência neste momento: ${si.routeFrequency}`
                default:
                    return `${patMsg}😐 ${si.status.message}`
            }
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        try {
            const cache = await this.getCache(type)
            if (cache && !forceUpdate)
                return cache

            const body: string = await this.getInformation(type)
            const obj = this.getCheerioObject(body)
            let res: any

            switch(type) {
                case TransportType.SUBWAY:
                    res = Lisboa.getSubwayStatus(obj)
                    break
            }

            return res
        } catch (err) {
            return Promise.reject(err)
        }
    }

    private static getSubwayStatus(obj: CheerioStatic) {
        const lines: SystemType[] = []
        for (let i = 0; i < 4; ++i) {
            const routeName = Lisboa.getLineStateByIndex(i, true)
            const lineId = Lisboa.getLineStateByIndex(i)

            let routeFrequency: string
            let statusMessage: string
            let statusCode: number

            obj(lineId + ' div[id]').each((k: number, elem: any) => {
                let data = elem.children[1].data
                if (k % 2 === 0) {
                    routeFrequency = data.slice(2) || 'N/A'
                    if (routeFrequency !== 'N/A') {
                        const freqSpl = routeFrequency.split(':')
                        routeFrequency = `${freqSpl[0]}m:${freqSpl[1]}s`
                    }
                } else {
                    statusCode = Lisboa.convertStatusMessageToCode(data)
                    if ((routeFrequency === 'N/A' && statusCode !== 0) || statusCode === 2) {
                        statusMessage = 'Existem problemas na circulação.'
                        statusCode === 2
                    } else {
                        statusMessage = data
                    }
                }
            })

            lines[i] = {
                routeName,
                routeId: i,
                routeFrequency,
                status: {
                    message: statusMessage,
                    code: statusCode
                }
            }
        }

        return lines
    }

    private static getLineStateByIndex(index: number, fullName?: boolean): string {
        switch(index) {
            case 0: 
                return fullName ? 'Linha Azul' : '#estadoAzul'
            case 1:
                return fullName ? 'Linha Amarela' : '#estadoAmarela'
            case 2:
                return fullName ? 'Linha Verde' : '#estadoVerde'
            case 3: 
                return fullName ? 'Linha Vermelha' : '#estadoVermelha'
            default:
                return null
        }
    }

    private static convertStatusMessageToCode(message: string): number {
        switch(message) {
            case 'Circulação normal.':
                return 1
            case 'Serviço encerrado.':
                return 0
            default: 
                return 2
        }
    }
}