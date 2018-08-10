import fetch from 'node-fetch'

const MailjetAPI: string = 'https://api.mailjet.com/v3.1/send'
export default class Emails {
    private auth: MailjetAuth
    private from: MailjetPerson
    private sysadmin: MailjetPerson[]

    constructor(auth: MailjetAuth, from: MailjetPerson, sysadmin: MailjetPerson[]) {
        this.auth = auth
        this.from = from
        this.sysadmin = sysadmin
    }

    public sendErrorEmail(err: any) {
        this.sendEmail([
            {
                From: this.from,
                To: this.sysadmin,
                Subject: "[ptransit] an error occurred",
                TextPart: `An API error just occurred.\nError details: ${err.toString()}\n\nThis is an automated email. Please do not respond.`
            }
        ])
    }

    public async sendEmail(Messages: MailjetMail[]): Promise<boolean> {
        const AuthVal = Buffer.from(`${this.auth.smtp_username}:${this.auth.smtp_password}`).toString('base64')
        const AuthHeader = `Basic ${AuthVal}`

        try {
            const res = await fetch(MailjetAPI, { 
                method: 'POST',
                body: JSON.stringify({ Messages }),
                headers: {
                    'Authorization': AuthHeader,
                    'Content-Type': 'application/json'
                }
            })
    
            return res.status === 200
        } catch {
            console.error('Cannot send emails to sysadmins')
            return Promise.reject(false)
        }
    }
}

export interface MailjetAuth {
    smtp_username: string
    smtp_password: string
}

export interface MailjetMail {
    From: MailjetPerson
    To: MailjetPerson[]
    Cc?: MailjetPerson[]
    Bcc?: MailjetPerson[]
    Subject: string
    TextPart: string
    HTMLPart?: string
    TemplateId?: string
}

export interface MailjetPerson {
    Email: string
    Name: string
}