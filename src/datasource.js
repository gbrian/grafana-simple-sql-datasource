import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url || "";
    var m = /con\=(.*)/.exec(this.url.split("?")[1]);
    this.connection = m ? m[1]: null;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
  }

  buildRequest(rqtype, data){
    return { 
      type: rqtype,
      body: data,
      url: this.connection 
    };
  }

  query(options) {
    var query = this.buildQueryParameters(options);
    
    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    return this.backendSrv.datasourceRequest({
      url: this.url,
      data: this.buildRequest("query", query ),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  testDatasource() {
    return this.backendSrv.datasourceRequest({
      url: this.url,
      method: 'POST',
      data: this.buildRequest("test", null)
    }).then(result => {
      return { status: "success", message: "Data source is working", title: "Success" };
    }).catch(result => {
      return { status: "error", message: result, title: "Error" };
    });
  }

  annotationQuery(options) {
    var annotationQuery = _.assignIn({}, options);
    annotationQuery.annotation.query = this.templateSrv.replace(options.annotation.query, {}, 'glob'); 
    
    return this.backendSrv.datasourceRequest({
      url: this.url,
      method: 'POST',
      data: this.buildRequest("annotations", annotationQuery)
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(options) {
    var opsAsString = typeof (options) === "string";
    if(options && options.type == 'sql')
      // TODO: Parser?
      return this.q.when([]);
    var target = opsAsString ? options : options.target;
    var interpolated = {
        target: this.templateSrv.replace(target, null, 'regex')
    };

    return this.backendSrv.datasourceRequest({
      url: this.url,
      data: this.buildRequest("search", interpolated ),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(this.mapToTextValue);
  }

  mapToTextValue(result) {
    return _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        return { text: d, value: i};
      }
      return { text: d, value: d };
    });
  }

  buildQueryParameters(options) {
    var clonedOptions = _.cloneDeep(options);
    var targets = _.filter(clonedOptions.targets, target => 
      target.target !== 'select metric' && !target.hide);

    targets = _.map(targets, target => 
      _.assignIn(target, { target: this.templateSrv.replace(target.target, options.scopedVars, "distributed")}));

    clonedOptions.targets = targets;

    return clonedOptions;
  }
}
