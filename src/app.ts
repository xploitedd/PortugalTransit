import { TransportScraper } from './scraper/TransportScraper';
import WebServer from './webserver'
import Twitter from './twitter/Twitter'

let config
let consumer_key: string
let secret_consumer_key: string
let access_token: string
let secret_access_token: string
let port: number

try {
    config = require('../config')
    consumer_key = config.twitter.consumer_key
    secret_consumer_key = config.twitter.secret_consumer_key
    access_token = config.twitter.access_token
    secret_access_token = config.twitter.secret_access_token
    port = config.port 
} catch (err) {
    exit(err)
}

const tw = new Twitter({
    consumer_key,
    secret_consumer_key,
    access_token,
    secret_access_token
})

const Transports = new TransportScraper(tw)
WebServer.startWebServer(port, Transports)

function exit(err: string) {
    console.error(err)
    process.exit(0)
}
