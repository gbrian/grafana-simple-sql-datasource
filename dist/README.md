# grafana-simple-sql-datasource

Allows querying SQL based datasources like SQL Server.

## Usage
Currently the plugin requires a proxy server running to communicate with the database.

**Install sqlproxyserver**

 * Run npm install on the plugin directory
 * Run server side code `/serverside/sqlproxyserver.js`

**Add new datasource**
Add a new datasource to Grafana and set the url to:

````
http://myserver:port/?con=mssql://user:name@server/database
````

Where:

 * **myserver:port** : Is the server where `sqlproxyserver` is running
 * **con**: Specifies the sql connection string

## SQL Databases
Currently supported SQL databases

### SQL Server
SQL Server connection is managed by the mssqp package https://www.npmjs.com/package/mssql  
  
