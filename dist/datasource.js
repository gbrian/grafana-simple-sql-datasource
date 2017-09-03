"use strict";

System.register(["lodash"], function (_export, _context) {
  "use strict";

  var _, _createClass, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export("GenericDatasource", GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, GenericDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url || "";
          var m = /con\=(.*)/.exec(this.url.split("?")[1]);
          this.connection = m ? m[1] : null;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
        }

        _createClass(GenericDatasource, [{
          key: "buildRequest",
          value: function buildRequest(rqtype, data) {
            return {
              type: rqtype,
              body: data,
              url: this.connection
            };
          }
        }, {
          key: "query",
          value: function query(options) {
            var query = this.buildQueryParameters(options);

            if (query.targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            return this.backendSrv.datasourceRequest({
              url: this.url,
              data: this.buildRequest("query", query),
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {
            return this.backendSrv.datasourceRequest({
              url: this.url,
              method: 'POST',
              data: this.buildRequest("test", null)
            }).then(function (result) {
              return { status: "success", message: "Data source is working", title: "Success" };
            }).catch(function (result) {
              return { status: "error", message: result, title: "Error" };
            });
          }
        }, {
          key: "annotationQuery",
          value: function annotationQuery(options) {
            var annotationQuery = _.assignIn({}, options);
            annotationQuery.annotation.query = this.templateSrv.replace(options.annotation.query, {}, 'glob');

            return this.backendSrv.datasourceRequest({
              url: this.url,
              method: 'POST',
              data: this.buildRequest("annotations", annotationQuery)
            }).then(function (result) {
              return result.data;
            });
          }
        }, {
          key: "metricFindQuery",
          value: function metricFindQuery(options) {
            var opsAsString = typeof options === "string";
            if (options && options.type == 'sql')
              // TODO: Parser?
              return this.q.when([]);
            var target = opsAsString ? options : options.target;
            var interpolated = {
              target: this.templateSrv.replace(target, null, 'regex')
            };

            return this.backendSrv.datasourceRequest({
              url: this.url,
              data: this.buildRequest("search", interpolated),
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }).then(this.mapToTextValue);
          }
        }, {
          key: "mapToTextValue",
          value: function mapToTextValue(result) {
            return _.map(result.data, function (d, i) {
              if (d && d.text && d.value) {
                return { text: d.text, value: d.value };
              } else if (_.isObject(d)) {
                return { text: d, value: i };
              }
              return { text: d, value: d };
            });
          }
        }, {
          key: "buildQueryParameters",
          value: function buildQueryParameters(options) {
            var _this = this;

            var clonedOptions = _.cloneDeep(options);
            var targets = _.filter(clonedOptions.targets, function (target) {
              return target.target !== 'select metric' && !target.hide;
            });

            targets = _.map(targets, function (target) {
              return _.assignIn(target, { target: _this.templateSrv.replace(target.target, options.scopedVars, "distributed") });
            });

            clonedOptions.targets = targets;

            return clonedOptions;
          }
        }]);

        return GenericDatasource;
      }());

      _export("GenericDatasource", GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
