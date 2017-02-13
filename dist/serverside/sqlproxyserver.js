var _ = require("lodash");
var q = require("q");
var moment = require("moment");

function SQLProxyServer(providerFactory) {
    this.providerFactory = providerFactory || this.defaultProviderFactory;
}

SQLProxyServer.prototype.defaultProviderFactory = function(url){
    var m = /([^:]*).*/.exec(url);
    if(!m) return q.reject("Invalid connection " + url);
    try{
      return q.resolve(require('./' + m[1] + "driver.js"));
    }catch(e){
      return q.reject(e);
    }
  }

SQLProxyServer.prototype.loadProvider = function(req){
    return this.providerFactory(req.url)
        .then(provider => {
          req.provider = new provider(req);
          return req;
        });
  } 

SQLProxyServer.prototype.loadAPI = function(req){
    return this.loadProvider(req)
            .then(d => new this.API(req));
  }

SQLProxyServer.prototype.execCommand = function(req){
    return this.loadAPI(req)
            .then(api => api.execute());
  }

SQLProxyServer.prototype.runStandalone = function(){
    var express = require('express');
    var bodyParser = require('body-parser');
    
    var app = express();
    
    app.use((req, res, next)=>{
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token,Authorization');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Expose-Headers', 'X-Api-Version, X-Request-Id, X-Response-Time');
        res.setHeader('Access-Control-Max-Age', '1000');
        return next();
    });

    app.use(bodyParser.json());
    var oThis = this;
    app.post("/*", function(req, res){
      oThis.execCommand(req.body)
        .then(data => res.send(data))
        .catch(err => 
          res.status(500).send(err));
    });
    
    var port = process.argv[2] || 666;
    app.listen(port);
    console.log("Server is listening to port " + port);
  }

SQLProxyServer.prototype.API = function(command){
    var _api = this;
    _api.cmd = command;
    
    _api.execute = function(){
      return (_api[_api.cmd.type] || _api.default)();
    }

    _api.default = function(){
      return q.reject("Invalid command " + _api.cmd.type);
    }
    
    _api.test = function(){
      return _api.cmd.provider.query("SELECT 1;")
                .then(r => {return{status:'sucess'}})
                .catch(_api.internals.error);
    };
    
    _api.query = function(){
      var queries = 
            _api.cmd.body.targets.map(t => {
              return _api.cmd.provider.query(t.target, _.assignIn({}, _api.cmd.body.range, t))
                .then(r => 
                  _api.internals.parse(_api.cmd, t, r).results
                )});
      return q.all(queries)
        .then(_.concat)
        .then(_.flatten);
    }
    
    _api.search = function(){
      
    }
    
    _api.annotations = function(){
      _api.cmd.body.targets = [{
        target: _api.cmd.body.annotation.query,
        annotation: _api.cmd.body.annotation,
        type: 'annotations'
      }];
      return _api.query();
    }
    
    _api.internals = {
      try: (fnc)=>{
        try{
          return fnc();
        }catch(e){ 
          console.error(e);
          return e;
        }
      },
      parse: (reqData, target, results)=>{
        if(target.type == "timeseries")
            return _api.internals.try(() => _api.internals.parseTimeseries(target, results));
        if(target.type == "table")
            return _api.internals.try(() => _api.internals.parseTable(target, results));
        if(target.type == "annotations")
          return _api.internals.try(() => _api.internals.parseAnnotations(target, results));
        return "Unsupported response type: " + target.type;  
      },
      parseAnnotations: (target, results) => {
        target.timestamp = _api.internals.getTimestamp(target, results);
        target.results = results.rows.map(r => _.assignIn(r, {
                                                  annotation: target.annotation,
                                                  time: _api.internals.utc(r[target.timestamp], target.utc).valueOf()
                                                }));
        return target;
      },
      utc: function(value, utc){
        if(utc == 'localtime' && (value && value.getTimezoneOffset)){
            var dateTime = moment(value);
            return dateTime.add(value.getTimezoneOffset(), 'm');
        }
        return value;
      },
      parseTimeseries: (target, results)=>{
        target.timestamp = _api.internals.getTimestamp(target, results);
        target.metric = _api.internals.getMetric(target, results);
        target.value = _api.internals.getMetricValue(target, results);
        target.results = _.map(
                          _.groupBy(results.rows, target.metric),
                          (v, k) => {
                            return {
                                target: k,
                                datapoints: v.map(r => [r[target.value], _api.internals.utc(r[target.timestamp], target.utc).valueOf()])
                            };
                          });
        return target;
      },
      parseTable: (target, results)=>{
        var mapType = function(sqltype){
          if(_.filter(['int', 'byte', 'decimal', 'float', 'double', 'money', 'bit',
                        'numeric', 'real'],
                    (sqlt) => sqltype.indexOf(sqlt) != -1).length != 0) 
            return "number";
          if(_.filter(['date', 'time'],
                    (sqlt) => sqltype.indexOf(sqlt) != -1).length != 0) 
            return "time";
          return "string";
        }
        var columns = _.map(results.columns, (v,k) =>{
            return {text:k, type:mapType(v.type.name.toLowerCase()), sqltype: v.type.name};
        });
        var rows = _.map(results.rows, (r) => _.map(r, (v) => v));
        target.results = {columns: columns, rows: rows, type:'table'};
        return target;
      },
      getTimestamp: (target, results)=>{
        return _api.internals.getSpecialColumn(results, (k, type) =>
            k == target.timestampKey ? 1000:
                                k.toLowerCase() == 'timestamp' ? 100:
                                  results.columns[k].type.name == 'DateTime' ? 1: 0)
      },
      getMetric: (target, results)=>{
        return _api.internals.getSpecialColumn(results, (k, type) => 
                        k == target.metric ? 1000:
                          ['metric', 'key'].indexOf(k.toLowerCase()) != -1  ? 100:
                          type == 'text' || type.indexOf('char') != -1 ? 1: 0)
      },
      getMetricValue: (target, results)=>{
        return _api.internals.getSpecialColumn(results, (k, type) => 
                        k == target.value ? 1000:
                          k.toLowerCase() == 'value' ? 100:
                            [target.timestamp, target.metric].indexOf(k.toLowerCase()) == -1  ? 1: 0)
      },
      getSpecialColumn: (results, score)=>{
        return _.orderBy(Object.keys(results.columns)
                    .map(k => {
                        var type = results.columns[k].type.name.toLowerCase(); 
                        return { key: k, score: score(k, type) }
                      }),
                  ['score'],
                  ['desc'])[0].key
        }
    }
    return this;
  }

if (require.main === module) {
    new SQLProxyServer().runStandalone();
} else {
    module.exports = SQLProxyServer;
}

