"use strict";

var adapters = [
  ['local-1', 'http-1'],
  ['http-1', 'http-2'],
  ['http-1', 'local-1'],
  ['local-1', 'local-2']];

var downAdapters = ['local-1'];
var deletedDocAdapters = [['local-1', 'http-1']];
var interHTTPAdapters = [['http-1', 'http-2']];

if (typeof module !== undefined && module.exports) {
  var PouchDB = require('../lib');
  var testUtils = require('./test.utils.js');
  downAdapters = [];
}

adapters.map(function(adapters) {
  QUnit.module('replication performance: ' + adapters[0] + ':' + adapters[1], {
    setup : function () {
      this.name = testUtils.generateAdapterUrl(adapters[0]);
      this.remote = testUtils.generateAdapterUrl(adapters[1]);
      PouchDB.enableAllDbs = true;
    },
    teardown: testUtils.cleanupTestDatabases
  });

  var docs = [];
  var amount = 500;
  for (var i = 0; i < amount; i++) {
    docs.push({
      _id: 'doc-' + i,
      integer: i,
      string: 'string-' + i
    });
  }

  function measure(name, db, fn) {
    db.bulkDocs({docs: docs}, {}, function(err, results) {
      var deletedDocs = results.map(function(doc) {
        return {
          _id: doc.id,
          _rev: doc.rev
        };
      });
      db.bulkDocs({docs: deletedDocs }, {}, function() {
        var msg = adapters.join(':') + ' ' + name;
        console.time(msg);
        var now = new Date();
        fn(function(done) {
          var duration = new Date() - now;
          var dps = docs.length / duration * 1000;
          console.timeEnd(msg);
          console.log(msg, dps, 'dps');
          done(dps);
        });
      });
    });
  }

  asyncTest("Test basic pull replication performance", function() {
    var self = this;
    testUtils.initDBPair(this.name, this.remote, function(db, remote) {
      measure('pull replication', remote, function(done) {
        db.replicate.from(self.remote, function(err, result) {
          done(function(dps) {
            ok(result.ok, 'replication was ok');
            ok(result.docs_written === docs.length, 'correct # docs written with ' + dps + ' docs per second.');
            start();
          });
        });
      });
    });
  });

  asyncTest("Test basic pull replication performance with increased batch size", function() {
    var self = this;
    testUtils.initDBPair(this.name, this.remote, function(db, remote) {
      measure('pull replication with increased batch size', remote, function(done) {
        db.replicate.from(self.remote, { batch_size: docs.length }, function(err, result) {
          done(function(dps) {
            ok(result.ok, 'replication was ok');
            ok(result.docs_written === docs.length, 'correct # docs written with ' + dps + ' docs per second.');
            start();
          });
        });
      });
    });
  });

  asyncTest("Test basic push replication performance", function() {
    var self = this;
    testUtils.initDBPair(this.name, this.remote, function(db, remote) {
      measure('push replication', db, function(done) {
        db.replicate.to(self.remote, function(err, result) {
          done(function(dps) {
            ok(result.ok, 'replication was ok');
            ok(result.docs_written === docs.length, 'correct # docs written with ' + dps + ' docs per second.');
            start();
          });
        });
      });
    });
  });

  asyncTest("Test basic push replication performance with increased batch size", function() {
    var self = this;
    testUtils.initDBPair(this.name, this.remote, function(db, remote) {
      measure('push replication with increased batch size', db, function(done) {
        db.replicate.to(self.remote, { batch_size: docs.length }, function(err, result) {
          done(function(dps) {
            ok(result.ok, 'replication was ok');
            ok(result.docs_written === docs.length, 'correct # docs written with ' + dps + ' docs per second.');
            start();
          });
        });
      });
    });
  });
});
