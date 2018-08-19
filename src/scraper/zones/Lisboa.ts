import TransportScraper, { TransportType, SystemType } from '../TransportScraper';
import Zone from '../Zone'

export class Lisboa extends Zone {
    constructor() {
        super('Lisboa', { 
            [TransportType.SUBWAY]: 'https://www.metrolisboa.pt/wp-admin/admin-ajax.php?action=estado_linhas_ajax_action',
            [TransportType.FERRY]: 'http://www.transtejo.pt/wp-admin/admin-ajax.php'
        })
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

    protected async getFerryStatus(): Promise<any> {
        try {
            const res = await TransportScraper.getTranstejoStatus(this)
            return res
        } catch (err) {
            return Promise.reject(err)
        }
    }

    protected async getBusStatus(): Promise<any> {}

    protected async getSubwayStatus() {
        try {
            const body: string = await this.getInformation(TransportType.SUBWAY)
            const obj = Zone.getCheerioObject(body)
            const lines: SystemType[] = []
            for (let i = 0; i < 4; ++i) {
                const routeName = Lisboa.getSubwayLineStateByIndex(i, true)
                const lineId = Lisboa.getSubwayLineStateByIndex(i)

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
                        statusCode = Lisboa.convertSubwayStatusMessageToCode(data)
                        if ((routeFrequency === 'N/A' && statusCode !== 0) || statusCode === 2) {
                            statusMessage = 'Existem problemas na circulação.'
                            statusCode = 2
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
        } catch (err) {
            return Promise.reject(err)
        }
    }

    private static getSubwayLineStateByIndex(index: number, fullName?: boolean): string {
        switch (index) {
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

    private static convertSubwayStatusMessageToCode(message: string): number {
        switch (message) {
            case 'Circulação normal.':
                return 1
            case 'Serviço encerrado.':
                return 0
            default: 
                return 2
        }
    }
}