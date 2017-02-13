var mssql = require("mssql");
var q = require("q");

function mssqldriver(options){
  this.options = options;
}

mssqldriver.prototype.buildQuery = function(cmd, parameters){
  if(parameters){
    var re = /[@$]([a-z0-9A-Z]*)/g;
    var m = null;
    while((m = re.exec(cmd)))
      if(parameters.hasOwnProperty(m[1]))
        cmd = cmd.replace(m[0], parameters[m[1]]);
  }
  return q.resolve(cmd);
}

mssqldriver.prototype.connect = function(url){
  return mssql.connect(url || this.options.url);
}

mssqldriver.prototype.query = function(command, parameters){ 
    var defer = q.defer();
    var driver = this;
    this.buildQuery(command, parameters)
    .then(sql => this.connect()
                .then(conn => new mssql.Request(conn).query(sql, (err, results) => 
                      defer[err ? "reject" : "resolve"](err || driver.parseResults(results))
                ))
    )
    .catch(defer.reject);
    return defer.promise;
}

mssqldriver.prototype.parseResults = function(results){
  return results ? {
    columns: results.columns,
    rows: results.map(r => r)
  }:{};
}

module.exports = mssqldriver;