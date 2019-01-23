[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/http-close-channel.svg)](https://npmjs.org/package/http-close-channel)

# http-close-channel

Express middleware for managing and closing HTTP channels.  This middleware sends HTTP `Connection Close` headers to prompt the client to close the socket connection.  This is useful for the following cases:

1. ensuring that HTTP traffic is evenly distributed across application replicas (e.g., even load distribution across pods in Kubernetes)
1. closing sockets during graceful shutdown

## Middleware Options

The middleware takes the following options:

|option|type|description|default|from version|
|------|----|-----------|-------|------------|
|`gracefulShutdown`|Boolean|Enable closing sockets after the app receives a `SIGTERM` signal|`false`|`1.0.0`|
|`maxRequests`|Integer|Set the number of requests per socket connection before the middleware will close the socket|`100`|`1.0.0`|
|`logger`|Object|A logger object (see example below)|`null` no logging|`1.0.0`|

## Example usage

The middleware can be added to an [express](https://expressjs.com/) app with the following steps...

1. include the package...

```bash
npm install http-close-channel --save
```

2. apply the middleware to the app...

```javascript
// include the middleware
const httpCloseChannel = require('http-close-channel');

// create the app object
const app = express();

// add the middleware to the apps stack...
app.use(httpCloseChannel({
  maxRequests: 50,
  gracefulShutdown: true,
}));
```

### Providing a logger

The middleware will make standard logging calls (e.g., `logger.info(...)`, `logger.warn(...)`).  This option has been tested with a [bunyan](https://www.npmjs.com/package/bunyan) logger. For example:

```javascript
const bunyan = require('bunyan');

// create the app object
const app = express();

// create a bunyan based app logger
const loggerConfig = {
  name: 'k8s-test-utils',
  streams: [
    {
      level: 'debug',
      type: 'stream',
      stream: process.stdout,
    },
  ],
};
const appLogger = bunyan.createLogger(loggerConfig);

// pass the logger to the middleware
app.use(httpCloseChannel({
  logger: appLogger,
}));
```
