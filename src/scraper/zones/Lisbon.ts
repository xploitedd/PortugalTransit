import { TransportType, Zone, MetroType } from '../TransportScraper'

export class Lisbon extends Zone {
    constructor() {
        super('Lisbon', { 
            [TransportType.SUBWAY]: 'https://www.metrolisboa.pt/wp-admin/admin-ajax.php?action=estado_linhas_ajax_action',
        })
    }

    public parseInformation(type: TransportType) {
        return new Promise((resolve, reject) => {
            this.getInformation(type).then(body => {
                const obj = this.getCheerioObject(body)
                const lines: MetroType[] = []

                for (let i = 0; i < 4; ++i) {
                    const fullName = Lisbon.getLineStateByIndex(i, true)
                    const lineId = Lisbon.getLineStateByIndex(i)

                    let trainFrequency: string
                    let statusMessage: string
                    let statusCode: number

                    obj(lineId + ' div[id]').each((k, elem) => {
                        let data = elem.children[1].data
                        if (k % 2 === 0) {
                            trainFrequency = data.slice(2) || 'N/A'
                        } else {
                            if (trainFrequency === 'N/A')
                                statusMessage = 'Serviço encerrado.'
                            else
                                statusMessage = data

                            statusCode = Lisbon.convertStatusMessageToCode(data)
                        }
                    })

                    lines[i] = {
                        fullName,
                        status: {
                            message: statusMessage,
                            code: statusCode
                        },
                        trainFrequency
                    }
                }

                resolve(lines)
            }).catch(reject)
        })
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