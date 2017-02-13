// Loading dist version instead "test" because I have no idea about
// how to prevent the test side to be "babelized"
var SQLProxyServer = require("../../serverside/sqlproxyserver.js");
import Q from "q";
import _ from "lodash";

describe('sqlproxyserver', function() {
    function mocksqldriver(options){
        this.options = options;
    }
    mocksqldriver.prototype.connect = function(){
        if(!this.options.url)
            return Q.reject("Invalid or empty connection string");
        return Q.resolve(this.options);
    };
    mocksqldriver.prototype.query = function(cmd){
        var results = {
            query:cmd,
            columns:{
                metric:{type:{name:'VarChar'}},
                value:{type:{name:'Int'}},
                timestamp:{type:{name:'DateTime'}}
            },
            rows:[{metric:'metric', value:1, timestamp:new Date()}]
        };
        return this.connect()
                .then(() => results);
    };
    
    var sqlproxyds = null;
    var query = {type:'query',url:'mssql://....',
                body: {
                    targets:[{
                        target: 'SELECT 1',
                        type: 'timeseries' 
                    },{
                        target: 'SELECT 1',
                        type: 'table' 
                    }],
                    range:{from: '',to: ''}}
                };
    
    
    beforeEach(function() {
        sqlproxyds = new SQLProxyServer(()=>Q.resolve(mocksqldriver));
    });

    it('should fail for empty connection string', function(done) {
        sqlproxyds.execCommand({type:'test'})
            .catch(err => done());
    });

    it('should test', function(done) {
        sqlproxyds.execCommand({type:'test', url:'mssql://....', body:{targets:[{}]}})
            .then(r => {
               assert(r.status == 'sucess', "Test failed");
               done();
            })
            .catch(done);
    });

    it('query shuld return timeseries', function(done) {
        sqlproxyds.execCommand(query)
            .then(r => {
                assert(r, "No data returned");
                assert(r.length == query.body.targets.length, 
                    "Wrong number of data set returned. Expected " + query.body.targets.length + " got " + r.length);
                var tsdt = r[0].datapoints;
                assert(tsdt[0][0] == 1, "Invalid data value returned");
                assert(new Date(tsdt[0][1]).getFullYear() == (new Date()).getFullYear(), 
                    "Invalid timestamp returned " + new Date(tsdt[0][1]));
                done();
            })
            .catch(done);
    });
    it('query shuld return table', function(done) {
        sqlproxyds.execCommand(query)
            .then(r => {
                assert(r, "No data returned");
                assert(r.length == query.body.targets.length, 
                    "Wrong number of data set returned. Expected " + query.body.targets.length + " got " + r.length);
                var tsdt = r[1];
                assert(tsdt.columns, "No columns found");
                assert(tsdt.rows, "No rows found");
                assert(tsdt.type == "table", "Inavlid type, espected 'table' found " + tsdt.type);
                assert(tsdt.columns.length != 0, "Invalid number of columns");
                assert(tsdt.columns.filter(c => ["number","string","time"].indexOf(c.type) == -1).length == 0, "Found invalid column type");
                assert(tsdt.columns.length == tsdt.rows[0].length, "Number fields don't not match number of columns");
                done();
            })
            .catch(done);
    });
});
