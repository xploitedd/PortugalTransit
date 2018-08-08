import { TransportScraper, TransportType } from './scraper/TransportScraper'

// const Transports = new TransportScraper()
// Transports.getZone('Lisbon').parseInformation(TransportType.SUBWAY)

import { WebServer } from './webserver'

new WebServer()

// 3rd step: send info to twitter