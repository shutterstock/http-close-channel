// Test modules
const { expect } = require('chai');
const { stub, assert } = require('sinon');

const _ = require('lodash');

// module under test
const httpKeepAlive = require('../index');

describe('middleware', () => {
  let req, res, next; // eslint-disable-line

  beforeEach(() => {
    [req, res, next] = [{ socket: { on: stub() } }, { set: stub() }, stub()];
  });

  it('creates new request counter', () => {
    const mw = httpKeepAlive({});
    mw(req, res, next);
    expect(req.socket).to.have.property('_httpKeepAliveMw');
    expect(req.socket._httpKeepAliveMw).to.have.property('id').with.lengthOf(36);
    expect(req.socket._httpKeepAliveMw.requestCount).to.equal(1);
    assert.calledOnce(next);
    assert.calledOnce(req.socket.on);
  });
  it('re-uses existing request counter', () => {
    const mw = httpKeepAlive({});
    mw(req, res, next);
    expect(req.socket).to.have.property('_httpKeepAliveMw');
    expect(req.socket._httpKeepAliveMw).to.have.property('id').with.lengthOf(36);
    expect(req.socket._httpKeepAliveMw.requestCount).to.equal(1);

    const socketId = req.socket._httpKeepAliveMw.id;
    // run it a second time...
    mw(req, res, next);
    expect(req.socket._httpKeepAliveMw.id).to.equal(socketId);
    expect(req.socket._httpKeepAliveMw.requestCount).to.equal(2);
    assert.calledTwice(next);
    assert.calledOnce(req.socket.on);
  });
  it('sends connection close header after maxRequests is reached', () => {
    const mw = httpKeepAlive({ maxRequests: 5 });
    _.times(4, () => mw(req, res, next));
    assert.notCalled(res.set);
    // call it the 5th time...
    mw(req, res, next);
    assert.calledOnce(res.set);
    assert.calledWithExactly(res.set, 'Connection', 'close');
    assert.callCount(next, 5);
  });

  it('uses the logger provided', () => {
    const logger = { debug: stub() };
    const mw = httpKeepAlive({ logger });
    mw(req, res, next);
    assert.callCount(logger.debug, 2);
  });

  it('sends connection closed header after SIGTERM when gracefulShutdown is enabled', () => {
    const mw = httpKeepAlive({ gracefulShutdown: true });
    mw(req, res, next);
    assert.notCalled(res.set);
    process.emit('SIGTERM');
    mw(req, res, next);
    assert.calledWithExactly(res.set, 'Connection', 'close');
  });
});
