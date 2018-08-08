[![repofunding](https://img.shields.io/badge/powered%20by-repofunding-green.svg)](https://github.com/gbrian/repofunding) [![](https://img.shields.io/badge/support-5€-lightgray.svg)](https://www.paypal.me/repofunding/5)
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
select 'Metric Name' as metric, -- Use a literal or group by a column for the labels
		count(*) as hits, -- Just counting occurrences
		ts as [timestamp]
from (
	Select dbo.scale_interval(dateColumn, '$Interval') as ts -- scale datetime to $Interval (e.g. 10m)
	from myTable
	where dateColumn >= '$from' and dateColumn < '$to'
) T
group by ts
order by ts asc
```` 

### MISC
#### scale_interval
Simple TSQL to group series by an interval

````
ALTER FUNCTION scale_interval 
(
	-- Add the parameters for the function here
	@dt as datetime, @interval as varchar(100)
)
RETURNS DateTime
AS
BEGIN
	DECLARE @amount int = 10

	IF  CHARINDEX('m', @interval) <> 0
	BEGIN
		SET @amount = CAST(REPLACE(@interval, 'm', '') as int)
		return dateadd(minute, datediff(mi, 0, @dt) / @amount * @amount, 0)
	END
	IF CHARINDEX('h', @interval) <> 0
	BEGIN
		SET @amount = CAST(REPLACE(@interval, 'h', '') as int)
		return dateadd(hour, datediff(hour, 0, @dt) / @amount * @amount, 0)
	END
	IF CHARINDEX('d', @interval) <> 0
	BEGIN
		SET @amount = CAST(REPLACE(@interval, 'd', '') as int)
		return dateadd(day, datediff(day, 0, @dt) / @amount * @amount, 0) 
	END
	RETURN NULL
END
GO
````


## Thanks to
Grafana team and [@bergquist](https://github.com/bergquist)
 
## *Powered by <a href="https://github.com/gbrian/repofunding">@repofunding*<img src="https://avatars1.githubusercontent.com/u/38230168?s=460&v=4" width="32" height="32"/></a>
