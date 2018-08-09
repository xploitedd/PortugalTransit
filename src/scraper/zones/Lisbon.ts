import { TransportType, Zone, SystemType } from '../TransportScraper'

export class Lisbon extends Zone {
    constructor() {
        super('Lisbon', { 
            [TransportType.SUBWAY]: 'https://www.metrolisboa.pt/wp-admin/admin-ajax.php?action=estado_linhas_ajax_action',
        })
    }

    public async getTwitterInfo(type: TransportType, lineNumber: number): Promise<string | boolean> {
        const date = new Date()
        const info: SystemType[] = await this.parseInformation(type)
        const si: SystemType = info[lineNumber]

        switch(si.status.code) {
            case 0: 
                return `😡😡😡 ${this.zoneName} às ${date.getHours()}h e ${date.getMinutes()} ${si.routeName}m\n${si.status.message}`
            case 1:
                return `😄😄😄 ${this.zoneName} às ${date.getHours()}h e ${date.getMinutes()} ${si.routeName}m\nO serviço foi restaurado à normalidade\nFrequência de Comboios: ${si.routeFrequency}`
            default:
                return `😐😐😐 ${this.zoneName} às ${date.getHours()}h e ${date.getMinutes()} ${si.routeName}m\n${si.status.message}`
        }
    }

    public async parseInformation(type: TransportType, forceUpdate?: boolean): Promise<any> {
        if (this.cache[type] && !forceUpdate)
            return this.cache[type]

        try {
            const body: string = await this.getInformation(type)
            const obj = this.getCheerioObject(body)
            let res: any

            switch(type) {
                case TransportType.SUBWAY:
                    res = Lisbon.getSubwayStatus(obj)
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
            const routeName = Lisbon.getLineStateByIndex(i, true)
            const lineId = Lisbon.getLineStateByIndex(i)

            let routeFrequency: string
            let statusMessage: string
            let statusCode: number

            obj(lineId + ' div[id]').each((k: number, elem: any) => {
                let data = elem.children[1].data
                if (k % 2 === 0) {
                    routeFrequency = data.slice(2) || 'N/A'
                } else {
                    if (routeFrequency === 'N/A')
                        statusMessage = 'Existem problemas na circulação.'
                    else
                        statusMessage = data

                    statusCode = Lisbon.convertStatusMessageToCode(statusMessage)
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