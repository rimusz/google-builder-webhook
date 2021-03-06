'use strict';

const fs = require('fs');
const should = require('should');
const async = require('async');
const lib = require('./index.js');

const base64Build = 'eyJpZCI6IjE3NDBjZTJhLTYxZDktNGE1OC1iM2M3LWNmYWQ5OWRiOGQwYSIsInByb2plY3RJZCI6Im5vZGUtZXhhbXBsZS1na2UiLCJzdGF0dXMiOiJTVUNDRVNTIiwic291cmNlIjp7InJlcG9Tb3VyY2UiOnsicHJvamVjdElkIjoibm9kZS1leGFtcGxlLWdrZSIsInJlcG9OYW1lIjoibm9kZS1leGFtcGxlLWZyb250ZW5kIiwiYnJhbmNoTmFtZSI6Im1hc3RlciJ9fSwic3RlcHMiOlt7Im5hbWUiOiJnY3IuaW8vY2xvdWQtYnVpbGRlcnMvZG9ja2VyIiwiYXJncyI6WyJidWlsZCIsIi10IiwiZ2NyLmlvL25vZGUtZXhhbXBsZS1na2UvZnJvbnRlbmQ6NDg5OTFiNGE3Yjc0MThhMzVkMDBlZGVkMDI4YWUxZmMwNmE0ZmM3NSIsIi4iXX1dLCJyZXN1bHRzIjp7ImltYWdlcyI6W3sibmFtZSI6Imdjci5pby9ub2RlLWV4YW1wbGUtZ2tlL2Zyb250ZW5kOjQ4OTkxYjRhN2I3NDE4YTM1ZDAwZWRlZDAyOGFlMWZjMDZhNGZjNzUiLCJkaWdlc3QiOiJzaGEyNTY6ZDgyMTMyZDlmYTc4NTllNDA4NWFhZThhZjJlZmY2MmZhM2Q1MDhkYjlhOGZkNDE2OWVlN2I2MThkM2YzMjZkNyJ9XSwiYnVpbGRTdGVwSW1hZ2VzIjpbInNoYTI1NjpmYmRiNTBhMmQ5ZDkzOTE2YWUwMTkzYWJmZDQ3OTZmNGI1ODAxNDNmNjBhOTQwNmU1NDY5MDZjOWJiZTc2OGEwIl19LCJjcmVhdGVUaW1lIjoiMjAxNy0wMy0xOVQwMDowNzoyMC4zNTQyMjNaIiwic3RhcnRUaW1lIjoiMjAxNy0wMy0xOVQwMDowNzoyMS4xNTQ0NDI0NjNaIiwiZmluaXNoVGltZSI6IjIwMTctMDMtMTlUMDA6MDg6MTIuMjIwNTAyWiIsInRpbWVvdXQiOiI2MDAuMDAwcyIsImltYWdlcyI6WyJnY3IuaW8vbm9kZS1leGFtcGxlLWdrZS9mcm9udGVuZDo0ODk5MWI0YTdiNzQxOGEzNWQwMGVkZWQwMjhhZTFmYzA2YTRmYzc1Il0sInNvdXJjZVByb3ZlbmFuY2UiOnsicmVzb2x2ZWRSZXBvU291cmNlIjp7InByb2plY3RJZCI6Im5vZGUtZXhhbXBsZS1na2UiLCJyZXBvTmFtZSI6Im5vZGUtZXhhbXBsZS1mcm9udGVuZCIsImNvbW1pdFNoYSI6IjQ4OTkxYjRhN2I3NDE4YTM1ZDAwZWRlZDAyOGFlMWZjMDZhNGZjNzUifX0sImJ1aWxkVHJpZ2dlcklkIjoiNjg2ZjljMzUtMzdjNy00MzJiLWFlOGYtYzQ0MGUwY2M0MDg5IiwibG9nVXJsIjoiaHR0cHM6Ly9jb25zb2xlLmRldmVsb3BlcnMuZ29vZ2xlLmNvbS9sb2dzL3ZpZXdlcj9wcm9qZWN0PW5vZGUtZXhhbXBsZS1na2VcdTAwMjZyZXNvdXJjZS5sYWJlbHMuYnVpbGRfaWQ9MTc0MGNlMmEtNjFkOS00YTU4LWIzYzctY2ZhZDk5ZGI4ZDBhIn0=';

const MS_PER_MINUTE = 60000;

const contains = (str, substr) => {
  return str.indexOf(substr) > -1
}

describe('eventToBuild', () => {
  it('should transform a base64 build to an object', () => {
    let build = lib.eventToBuild(base64Build);
    should.exist(build.projectId);
    build.projectId.should.equal('node-example-gke');
  });
});

function cleanConfig(callback) {
  let config = {
    WEBHOOK: "xxx",
  }
  fs.writeFile('config.json', JSON.stringify(config), 'utf8', callback);
}

describe('subscribe', () => {
  beforeEach(cleanConfig);
  afterEach(cleanConfig);

  beforeEach(() => {
    this.requestCalled = false;
    lib.request.post = (message, callback) => {
      this.requestCalled = true;
      return callback();
    }
  });

  it('should subscribe to pubsub message and send an http request to webhook', (done) => {
    let event = {
      data: {
        data: base64Build
      }
    };
    lib.subscribe(event, () => {
      this.requestCalled.should.be.true();
      done();
    });
  });

  it('should not send a message for non final status (by default)', (done) => {
    let testCases = [
      {
        status: 'QUEUED',
        want: false,
      },
      {
        status: 'WORKING',
        want: false,
      },
      {
        status: 'SUCCESS',
        want: true,
      },
      {
        status: 'FAILURE',
        want: true,
      },
      {
        status: 'INTERNAL_ERROR',
        want: true,
      },
      {
        status: 'TIMEOUT',
        want: true,
      },
    ];
    async.forEach(testCases, (tc, doneEach) => {
      this.requestCalled = false;
      let event = {
        data: {
          data: new Buffer(JSON.stringify({
            status: tc.status,
          })).toString('base64')
        }
      };
      lib.subscribe(event, () => {
        this.requestCalled.should.equal(tc.want);
        doneEach();
      });
    }, done);
  });

  it('should a message only for specified status', (done) => {
    lib.status = ['FAILURE', 'INTERNAL_ERROR'];
    let testCases = [
      {
        status: 'QUEUED',
        want: false,
      },
      {
        status: 'WORKING',
        want: false,
      },
      {
        status: 'SUCCESS',
        want: false,
      },
      {
        status: 'FAILURE',
        want: true,
      },
      {
        status: 'INTERNAL_ERROR',
        want: true,
      },
      {
        status: 'TIMEOUT',
        want: false,
      },
    ];
    async.forEach(testCases, (tc, doneEach) => {
      this.requestCalled = false;
      let event = {
        data: {
          data: new Buffer(JSON.stringify({
            status: tc.status,
          })).toString('base64')
        }
      };
      lib.subscribe(event, () => {
        this.requestCalled.should.equal(tc.want, tc.status);
        doneEach();
      });
    }, function() {
      // clean the status list.
      lib.GC_STATUS = null;
      done();
    });
  });
});
