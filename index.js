const uuidv4 = require('uuid/v4');
const _ = require('lodash');

const socketParam = 'socket._httpKeepAliveMw';

module.exports = (opts) => {
  let shuttingDown = false;

  const options = _.merge({}, {
    maxRequests: 100,
  }, opts);

  // if a logger is provided use it...
  const log = options.logger ? (level, ...args) => {
    options.logger[level](...args);
  } : _.noop;

  if (options.gracefulShutdown) {
    process.on('SIGTERM', () => {
      log('debug', {}, 'keepalive-mw-SIGTERM-received');
      shuttingDown = true;
    });
  }

  return (req, res, next) => {
    if (!_.get(req, socketParam)) {
      // this socket does not have a keep alive object, create one
      const newId = uuidv4();
      _.set(req, socketParam, {
        id: newId,
        requestCount: 0,
      });
      log('debug', { socketId: newId }, 'keepalive-mw-new-socket');

      req.socket.on('close', () => {
        log('debug', { socketId: _.get(req, socketParam).id }, 'keepalive-mw-socket-closed');
      });
    }
    const keepAliveInfo = _.get(req, socketParam);
    log('debug', { socketId: keepAliveInfo.id }, 'keepalive-mw-request-received');

    // increment the requests count for this socket
    keepAliveInfo.requestCount += 1;

    const reqCountExceeded = keepAliveInfo.requestCount >= options.maxRequests;

    if (reqCountExceeded || shuttingDown) {
      log('debug', { socketId: keepAliveInfo.id, reqCountExceeded, shuttingDown }, 'keepalive-mw-sending-connection-close-header');
      res.set('Connection', 'close');
    }
    next();
  };
};
