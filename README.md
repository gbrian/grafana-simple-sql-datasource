# grafana-simple-sql-datasource

Allows querying SQL based datasources like SQL Server.

![SQL Plugi](https://raw.githubusercontent.com/gbrian/grafana-simple-sql-datasource/master/overview.png "Query editor")


## Usage
Currently the plugin requires a proxy server running to communicate with the database.

**Install sqlproxyserver**
 
 * Run `npm install` at the `dist/serverside` folder to install all dependencies
 * Run npm install on the plugin directory
 * Run server side code `dist/serverside/sqlproxyserver.js`
 * Test on your browser `http://myserver:port/con=mssql://user:name@server/database` you must get a `{"status":"sucess"}` response

**Add new datasource**
Add a new datasource to Grafana and set the url to:

````
http://myserver:port/con=mssql://user:name@server/database
````

Where:

 * **myserver:port** : Is the server where `sqlproxyserver` is running
 * **con**: Specifies the sql connection string

## SQL Databases
Currently supported SQL databases

### SQL Server
SQL Server connection is managed by the mssqp package https://www.npmjs.com/package/mssql  
  
## Features
Following features has been implemented

![Query editor](https://raw.githubusercontent.com/gbrian/grafana-simple-sql-datasource/master/query_editor.png "Query editor")

### Metrics
It is possible to define two different types: `timeseries` and `table`

### Annotation
Annotation querires must return the following fields:
 
 * **title**: Annotation header
 * **text**:  Annotation description
 * **tags**: Annotation tags
 * **time**: Annotation time

## Notes
### Time
UTC and Localtime. Currently you must specify if time returned by the query is UTC or local. 
The plugin will convert localtime to UTC in order to be correctly renderer.
### Template
You can use `$from` and `$to` to refer to selected time period in your queries like:

````
SELECT field FROM table WHERE datestart >= '$from' AND dateStart <= '$to'
```` 

## Thanks to
Grafana team and [@bergquist](https://github.com/bergquist)
 
