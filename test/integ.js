// integration tests
// test packages
const { expect } = require('chai');
const request = require('request');
const express = require('express');
const http = require('http');

// package under test
const httpKeepAlive = require('../index');

const _ = require('lodash');
const { inspect } = require('util');

const { timesSeries } = require('async');

const defaultClientOptions = {
  uri: 'http://127.0.0.1:3000/',
  method: 'GET',
  agent: new http.Agent({
    keepAlive: true,
  }),
  json: true,
};

const collectLogs = {
  debug: (data, msg) => {
    // remove to stop debug output in test
    console.log(`${inspect(data)}::${msg}`);  // eslint-disable-line no-console
  },
};

describe('integration test', function integrationTests() {
  this.timeout(20000);
  let server;

  // configure the test app
  const app = express();
  app.use(httpKeepAlive({
    maxRequests: 5,
    logger: collectLogs,
  }));
  app.get('/', (req, res) => res.send({ ok: true }));

  beforeEach((done) => {
    server = app.listen(3000, (err) => {
      done(err);
    });
  });

  afterEach((done) => {
    server.close((err) => {
      done(err);
    });
  });

  it('correctly add connection close header based on requests received and maxRequests option', (done) => {
    timesSeries(10, (n, cb) => {
      request(defaultClientOptions, (err, response) => {
        expect(err).to.be.null;
        cb(err, response.headers);
      });
    }, (err, headers) => {
      expect(err).to.be.null;
      expect(headers).to.have.length(10);
      // expect every 5th header to include the closed channel header
      const connectionHeaders = _.map(headers, responseHeaders => _.get(responseHeaders, 'connection', null));
      expect(connectionHeaders).to.deep.equal([
        'keep-alive', 'keep-alive', 'keep-alive', 'keep-alive', 'close',
        'keep-alive', 'keep-alive', 'keep-alive', 'keep-alive', 'close',
      ]);
      done();
    });
  });
});
