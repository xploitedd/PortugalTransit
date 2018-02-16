const restify = require('restify');
const server = restify.createServer();
const config = require('../config');

server.use(restify.plugins.queryParser());

server.get('/:type/:id/all', (req, res, next) => {
    var status;
    try {
        status = require(`./${req.params.type}/${req.params.id}`);
    } catch (err) {
        res.send({ error: `Invalid Request to: ${req.params.type}/${req.params.id} - ${err}` });
        return next();
    }

    status.information.getStatus().then(st => {
        res.send(st);
        return next();
    });
});

server.listen(config.server_port, () => {
    console.log(`[SUCCESS] API server listening on port ${config.server_port}`);
});