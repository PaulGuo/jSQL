
/*!
Copyright (c) 2012 Guo Kai, http://jsql.us/

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
KISSY.add(function(S) {
/*
    --------------- jSQL ---------------
    a SQL like database using javascript
    website: http://jsql.us
    licence: MIT Licence
    version: 0.7.0-dev
    
    description: using jSQL to process the data easily.
*/

(function() {
    var slice               = Array.prototype.slice,
        toString            = Object.prototype.toString,
        hasOwnProperty      = Object.prototype.hasOwnProperty;

    var nativeForEach       = Array.prototype.forEach,
        nativeIsArray       = Array.isArray,
        nativeKeys          = Object.keys,
        nativeIndexOf       = Array.prototype.indexOf,
        nativeLastIndexOf   = Array.prototype.lastIndexOf;

    var utils = {};
    var jSQL_KEY_NAME = 'jSQL_Key';
    var jSQL, _jSQL, _jsql, 
        _DB = {}, 
        _DBIndexMap = {}, 
        _protected = {},
        _events = {};

    var interpolation = function(str) {
        var args = [].slice.call(arguments, 1);

        return str.replace(/%s/igm, function() {
            return args.shift() || '';
        });
    };

    var logcat = {
        error: function(error) {
            error = interpolation(error);

            if(typeof(console) !== 'undefined') {
                if(console.warn) {
                    console.warn(error);
                    return;
                }

                if(console.log) {
                    console.log(error);
                    return;
                }
            }

            throw(error);
        },

        info: function(info) {
            info = interpolation(info);

            if(typeof(console) !== 'undefined') {
                if(console.info) {
                    console.info(info);
                    return;
                }

                if(console.log) {
                    console.log(info);
                    return;
                }
            }
        }
    };
    
    if(typeof(this.jSQL) !== 'undefined') {
        _jSQL = this.jSQL;
    }

    if(typeof(this.jsql) !== 'undefined') {
        _jsql = this.jsql;
    }
    
    jSQL = function() {
        this.init.apply(this, arguments);
    };
    
    jSQL.prototype = {
        version: '0.7.0-dev',

        init: function() {
            this._jSQL = _jSQL;
            this._jsql = _jsql;
            this._DB = _DB;
            this._currentDB = null;
            this._buffer = null;
            this._currentDBName = null;
            this._DBIndexMap = _DBIndexMap;
            this._protected = _protected;
            this._indexList = null;
            this._events = _events;
            this.utils = utils;
        },

        create: function(dbname, db /*, scope */) {
            var indexList;
            var that = this;

            if(this._DB.hasOwnProperty(dbname)) {
                logcat.error('DB Already Exist.');
            }

            if(utils.isArray(db)) {
                indexList = utils.listSlice(arguments, '2:');
                utils.appendKey(db, indexList);
                _DBIndexMap[dbname] = utils.arrayToObject(db);
                this._indexList = indexList || null; //remember indexList for insert/save
            }

            if(utils.isPlainObject(db)) {
                _DBIndexMap[dbname] = utils.clone(db);
                db = utils.objectToArray(db);
            }

            if(typeof(db) === 'string' && db.match(/^http(s)?:\/\//igm)) {
                var scope = arguments[2] || '*';
                var proxyCallback = function(data) {
                    db = typeof(scope) === 'function' ? 
                        scope.call(this, data) : 
                        scope === '*' ? 
                            data : utils.deep(data, scope);

                    that._DB[dbname] = utils.clone(db);
                    that._events[dbname] = that._events[dbname] || new that.Events();
                    that.trigger(dbname, 'create');
                    that.trigger(dbname, 'io:success');
                    that.trigger(dbname, 'io:complete');
                };

                var proxyFallback = function() {
                    that._events[dbname] = that._events[dbname] || new that.Events();
                    that.trigger(dbname, 'io:error');
                };

                if(db.match('callback=')) {
                    this.io.jsonp(db, {}, proxyCallback, proxyFallback);
                } else {
                    this.io.ajax(db, {}, proxyCallback, proxyFallback);
                }

                this._events[dbname] = this._events[dbname] || new this.Events();
                this.trigger(dbname, 'io:start');

                return this;
            }
            
            this._DB[dbname] = utils.clone(db);
            this._events[dbname] = this._events[dbname] || new this.Events();
            this.trigger(dbname, 'create');
            return this;
        },

        use: function(dbname) {
            if(!this._DB.hasOwnProperty(dbname)) {
                throw('Database Not Exist.');
            }

            this._currentDB = this._DB[dbname];
            this._currentDBName = dbname;
            this.rebase();
            return this;
        },

        drop: function(dbname) {
            if(this._DB.hasOwnProperty(dbname)) {
                delete this._DB[dbname];
                this.trigger(dbname, 'drop');
            }

            return this;
        },

        dbs: function() {
            return utils.keys(this._DB);
        },

        db: function() {
            return this._currentDBName;
        },

        select: function(key) {
            if(!this._currentDB) {
                throw('Please Select Database First.');
            }
            
            this._protected['field'] = [].slice.call(utils.isArray(key) ? key : arguments);
            
            if(key === '*') {
                return this;
            }
            
            return this;
        },

        count: function() {
            var result;
            result = this._buffer.length;
            this.rebase();
            return result;
        },
        
        total: function(scope) {
            var rs = 0, _tmp;
            
            for(var _key in this._currentDB) {
                if(this._currentDB.hasOwnProperty(_key)) {
                    _tmp = scope === '*' ? 
                        this._currentDB[_key] : 
                        typeof(scope) === 'function' ? 
                            scope.call(this, this._currentDB[_key], _key) === true ? true : undefined : 
                            utils.deep(this._currentDB[_key], scope);
                    
                    if(typeof(_tmp) !== 'undefined') {
                        rs++;
                    }
                }
            }
            
            return rs;
        },

        orderby: function(field, callback, order) {
            var _array = this._buffer;
            var _this = this;
            
            if(typeof(callback) !== 'function') {
                callback = [order, order = callback][0];
            }
            
            _array.sort(function(a, b) {
                a = utils.deep(a, field);
                b = utils.deep(b, field);
                if(callback) {
                    a = callback(a);
                    b = callback(b);
                }
                return  order && order.toLowerCase() === 'asc' ? a - b : b - a;
            });
            
            this._buffer = _array;
            this._protected['sort'] = true;
            return this;
        },

        where: function(fn) {
            var _tmp = [], _swap;
            this._buffer = this._buffer || this._currentDB;
            fn = utils.parseFn(fn);
            
            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    if(typeof(fn) === 'function') {
                        _swap = fn.call(this, utils.clone(this._buffer[i]), i);
                    }

                    if(utils.isArray(fn)) {
                        _swap = false;

                        for(var f in fn) {
                            if(fn.hasOwnProperty(f)) {
                                if(fn[f].call(this, utils.clone(this._buffer[i]), i)) {
                                    _swap = true;
                                }
                            }
                        }
                    }
                    
                    if(_swap) {
                        _tmp.push(this._buffer[i]);
                    }
                }
            }
            this._buffer = _tmp;
            return this;
        },

        iterate: function(fn) {
            this._buffer = this._buffer || this._currentDB;
            
            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    fn.call(this, this._buffer[i]);
                }
            }
            return this;
        },

        findAll: function() {
            var result;
            result = utils.clone(utils.arrayToObject(this._select()));
            this.rebase();
            return result;
        },

        find: function(key) {
            var result;
            var _tmp = this._DBIndexMap[this._currentDBName];

            if(!key) {
                for(var i in _tmp) {
                    if(_tmp.hasOwnProperty(i)) {
                        if(key) {
                            break;
                        }
                        
                        if(this._buffer.hasOwnProperty(i)) {
                            key = i;
                        }
                    }
                }
            }
            
            result = utils.clone(_tmp[key]);
            this.rebase();
            return result;
        },

        listAll: function() {
            var result;
            result = utils.clone(this._select());
            this.rebase();
            return result;
        },
        
        update: function(fn) {
            var _swap = this.utils.arrayToObject(this._currentDB);
            var _tmp;
            this._buffer = this._buffer || this._currentDB;

            if(!this._currentDB) {
                throw('Please Select Database First.');
            }

            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    _tmp = fn.call(this, utils.clone(this._buffer[i]));
                    
                    if(_tmp) {
                        _swap[this._buffer[i][jSQL_KEY_NAME]] = _tmp;
                    }
                }
            }

            this._currentDB = this.utils.objectToArray(_swap);
            this._DB[this._currentDBName] = this.utils.objectToArray(_swap);
            this.trigger(this._currentDBName, 'update');
            this.rebase();
            return this;
        },

        insert: function(item, key /*, fromIndex */) {
            var item = utils.clone(item);
            var fromIndex = arguments[2];

            item[jSQL_KEY_NAME] = item.key || key;
            fromIndex ?
                this._currentDB.splice(fromIndex, 0, item) :
                this._currentDB.push(item);
            this.trigger(this._currentDBName, 'update');
            this.rebase();
            return this;
        },

        append: function(database, data) {
            if(arguments.length > 1) {
                this.use(database);
            } else {
                data = arguments[0];
            }

            data = utils.clone(data);

            if(utils.isArray(data)) {
                utils.appendKey(data, this._indexList);
                this._currentDB = this._currentDB.concat(data);
            }

            if(utils.isPlainObject(data)) {
                this._currentDB = this._currentDB.concat(utils.objectToArray(data));
            }

            this._DB[this._currentDBName] = this.utils.objectToArray(this._currentDB);
            this.trigger(this._currentDBName, 'update');
            this.rebase();
            return this;
        },

        remove: function() {
            var that = this;
            var _swap = this.utils.arrayToObject(this._currentDB);
            this._buffer = this._buffer || this._currentDB;
            
            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    delete _swap[this._buffer[i][jSQL_KEY_NAME]];
                }
            }

            this._currentDB = this.utils.objectToArray(_swap);
            this._DB[this._currentDBName] = this.utils.objectToArray(_swap);
            this.rebase();
            return this;
        },
        
        limit: function(start, end) {
            var _tmp = this._buffer;
            var limit;
            
            if(!end) {
                start = [0, end = start][0];
            }

            limit = start + ':' + (start + end);
            
            this._buffer = utils.listSlice(_tmp, limit);
            return this;
        },

        keys: function() {
            return utils.keys(this.findAll());
        },

        first: function(fn) {
            if(fn) {
                return this.where(fn).first();
            }

            return utils.listSlice(this._select(), ':1');
        },

        last: function(fn) {
            if(fn) {
                return this.where(fn).last();
            }

            return utils.listSlice(this._select(), '-1:');
        },

        distinct: function(field) {
            return utils.distinct(this.listAll());
        },

        rebase: function() {
            this._protected = {};
            this.select('*');
            this._resetBuffer();
            this._updateIndexMap();
            return this;
        },

        noConflict: function() {
            if(window.jSQL === jSQL) {
                window.jSQL = this._jSQL;
            }

            if(window.jsql === jsql) {
                window.jsql = this._jsql;
            }

            return this;
        },

        io: new function() {
            var that = this;

            this.ajax = function(uri, data, success, error) {
                var args = [].slice.call(arguments);

                if(args.length < 4) {
                    args.splice(1, 0, {});
                }

                uri = args[0],
                data = args[1],
                success = args[2],
                error = args[3];

                data._t = utils.uuid();

                this.reqwest({
                    url: uri,
                    type: 'json',
                    method: 'get',
                    data: data,
                    success: success,
                    error: error
                });
            },

            this.jsonp = function(uri, data, success, error) {
                var args = [].slice.call(arguments);

                if(args.length < 4) {
                    args.splice(1, 0, {});
                }

                uri = args[0],
                data = args[1],
                success = args[2],
                error = args[3];

                if(!uri.match('callback=')) {
                    if(uri.match(/\?/igm)) {
                        if(uri.lastIndexOf('&') === uri.length - 1) {
                            uri += 'callback=?&_t=' + utils.uuid();
                        } else {
                            uri += '&callback=?&_t=' + utils.uuid();
                        }
                    } else {
                        uri += '?callback=?&_t=' + utils.uuid();
                    }
                }

                this.reqwest({
                    url: uri,
                    type: 'jsonp',
                    data: data,
                    success: success,
                    error: error
                });
            }
        },

        on: function(database, event, callback) {
            this._events[database] = this._events[database] || new this.Events();
            return this._events[database].on(event, callback);
        },

        off: function(database, event, callback) {
            return this._events[database].off(event, callback);
        },

        trigger: function(database, event) {
            var args = [].slice.call(arguments, 1);

            if(!this._events.hasOwnProperty(database)) {
                return false;
            }

            logcat.info('%s: trigger - %s', database, event);
            return this._events[database].trigger.apply(this._events[database], args);
        },

        alias: function(name) {
            window[name] = this;
            return this;
        },

        _select: function(field) {
            var tmp, result = [];

            field = field || this._protected['field'];

            if(this._protected['sort'] === true) {
                this.trigger(this._currentDBName, 'sort');
            }

            if(field === '*' || (field.join && field.join('') === '*')) {
                return this._buffer;
            }

            if(typeof(field) === 'string') {
                field = field.split(',');
            }

            utils.each(this._buffer, function(o, i, r) {
                tmp = {};
                tmp[jSQL_KEY_NAME] = utils.deep(o, jSQL_KEY_NAME);

                if(field.length === 1) {
                    result.push(utils.deep(o, field[0]));
                    return;
                }

                utils.each(field, function(_o, _i, _r) {
                    if(o.hasOwnProperty(_o)) {
                        tmp[_o.split('.').pop()] = utils.deep(o, _o);
                    }
                });
                result.push(tmp);
            });

            return result;
        },

        _updateIndexMap: function() {
            _DBIndexMap[this._currentDBName] = utils.arrayToObject(this._currentDB);
        },

        _resetBuffer: function() {
            this._buffer = this._currentDB; //reset the _buffer
        }
    };

    utils = {
        deep: function(data, scope) {
            var _tmp = data, scope = scope.split('.');
            for(var i = 0; i < scope.length; i++) {
                _tmp = _tmp[scope[i]];
            }
            return _tmp;
        },

        isArray: nativeIsArray || function(obj) {
            return toString.call(obj) === '[object Array]';
        },

        isObject: function(obj) {
            return obj === Object(obj);
        },

        isPlainObject: function(obj) {
            return this.isObject(obj) && obj.constructor === Object;
        },

        clone: function (obj) {
            if(obj == null || typeof(obj) != 'object') {
                return obj;
            }

            var temp = new obj.constructor();
            for(var key in obj) {
                temp[key] = arguments.callee(obj[key]);
            }

            return temp;
        },

        objectToArray: function(object) {
            var array = [], object = this.clone(object);
            
            for(var i in object) {
                if(object.hasOwnProperty(i)) {
                    object[i][jSQL_KEY_NAME] = i;
                    array.push(object[i]);
                }
            }
            
            return array;
        },

        arrayToObject: function(array, key) {
            var object = {};
            
            for(var i = 0; i < array.length; i++) {
                object[array[i][key || jSQL_KEY_NAME]] = this.clone(array[i]);
                delete object[array[i][key || jSQL_KEY_NAME]][key || jSQL_KEY_NAME];
            };
            
            return object;
        },

        each: function(list, fn) {
            if(nativeForEach) {
                list.forEach(fn);
                return;
            }

            for(var i = 0; i < list.length; i++) {
                fn(list[i], i, list);
            }
        },

        keygen: function(object, indexList) {
            var that = this;
            var baseRef = [].slice.call(arguments, 1);
            var key = '';

            if(that.isArray(indexList)) {
                baseRef = indexList;
            }

            that.each(baseRef, function(o, i, r) {
                key += utils.deep(object, o);
            });

            return key;
        },

        listSlice: function(list, range) {
            var start, end;

            list = [].slice.call(list);
            range = range.split(':');
            start = range[0] || 0;
            end = range.length > 1 ? range[1] || list.length : list.length;
            return [].slice.call(list, start, end);
        },

        appendKey: function(list, indexList) {
            var that = this;

            that.each(list, function(o, i, r) {
                o[jSQL_KEY_NAME] = that.keygen(o, indexList) || i;
            });
        },

        keys: nativeKeys || (function() {
            var hasDontEnumBug = true,
                dontEnums = [
                    'toString',
                    'toLocaleString',
                    'valueOf',
                    'hasOwnProperty',
                    'isPrototypeOf',
                    'propertyIsEnumerable',
                    'constructor'
                ],
                dontEnumsLength = dontEnums.length;

            for (var key in {'toString': null}) {
                hasDontEnumBug = false;
            }

            return function keys(object) {
                if ((typeof object != 'object' && typeof object != 'function') || object === null) {
                    throw new TypeError('Object.keys called on a non-object');
                }

                var keys = [];
                for (var name in object) {
                    if (object.hasOwnProperty(name)) {
                        keys.push(name);
                    }
                }

                if (hasDontEnumBug) {
                    for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                        var dontEnum = dontEnums[i];
                        if (object.hasOwnProperty(dontEnum)) {
                            keys.push(dontEnum);
                        }
                    }
                }
                return keys;
            };
        })(),

        parseFn: function(fn) {
            if(typeof(fn) === 'string') {
                fn = fn || true;
                fn = new Function('data', 'with(data) { return ' + fn + '; }');
            }

            return fn;
        },

        indexOf: function(list, sought /*, fromIndex */ ) {
            if(nativeIndexOf) {
                return nativeIndexOf.apply(list, this.listSlice(arguments, '1:'));
            }

            var self = list,
                length = self.length >>> 0;

            if (!length) {
                return -1;
            }

            var i = 0;
            if (arguments.length > 2) {
                i = arguments[2];
            }

            // handle negative indices
            i = i >= 0 ? i : Math.max(0, length + i);
            for (; i < length; i++) {
                if (i in self && self[i] === sought) {
                    return i;
                }
            }
            return -1;
        },

        lastIndexOf: function lastIndexOf(list, sought /*, fromIndex */) {
            if(nativeLastIndexOf) {
                return nativeLastIndexOf.apply(list, this.listSlice(arguments, '1:'));
            }

            var self = list,
                length = self.length >>> 0;

            if (!length) {
                return -1;
            }
            var i = length - 1;
            if (arguments.length > 1) {
                i = Math.min(i, toInteger(arguments[1]));
            }
            // handle negative indices
            i = i >= 0 ? i : length - Math.abs(i);
            for (; i >= 0; i--) {
                if (i in self && sought === self[i]) {
                    return i;
                }
            }
            return -1;
        },

        uuid: function() {
            return new Date().getTime() + '_' + parseInt(Math.random() * 1000);
        },

        distinct: function(arr) {
            var tmp = [];

            for(var i = 0; i < arr.length; i++) {
                if(tmp.indexOf(arr[i]) === -1) {
                    tmp.push(arr[i]);
                }
            }

            return tmp;
        }
    };

    jSQL = new jSQL();
    
    typeof(module) !== 'undefined' && module.exports ? module.exports = jSQL : this.jsql = this.jSQL = jSQL;
})();
/*!
  * Reqwest! A general purpose XHR connection manager
  * (c) Dustin Diaz 2013
  * https://github.com/ded/reqwest
  * license MIT
  */
!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('reqwest', jsql.io, function () {

  var win = window
    , doc = document
    , twoHundo = /^20\d$/
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , callbackPrefix = 'reqwest_' + (+new Date())
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , noop = function () {}

    , isArray = typeof Array.isArray == 'function'
        ? Array.isArray
        : function (a) {
            return a instanceof Array
          }

    , defaultHeaders = {
          contentType: 'application/x-www-form-urlencoded'
        , requestedWith: xmlHttpRequest
        , accept: {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , xml:  'application/xml, text/xml'
            , html: 'text/html'
            , text: 'text/plain'
            , json: 'application/json, text/javascript'
            , js:   'application/javascript, text/javascript'
          }
      }

    , xhr = win[xmlHttpRequest]
        ? function () {
            return new XMLHttpRequest()
          }
        : function () {
            return new ActiveXObject('Microsoft.XMLHTTP')
          }
    , globalSetupOptions = {
        dataFilter: function (data) {
          return data
        }
      }

  function handleReadyState(r, success, error) {
    return function () {
      // use _aborted to mitigate against IE err c00c023f
      // (can't read props on aborted request objects)
      if (r._aborted) return error(r.request)
      if (r.request && r.request[readyState] == 4) {
        r.request.onreadystatechange = noop
        if (twoHundo.test(r.request.status))
          success(r.request)
        else
          error(r.request)
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o.headers || {}
      , h

    headers.Accept = headers.Accept
      || defaultHeaders.accept[o.type]
      || defaultHeaders.accept['*']

    // breaks cross-origin requests with legacy browsers
    if (!o.crossOrigin && !headers[requestedWith]) headers[requestedWith] = defaultHeaders.requestedWith
    if (!headers[contentType]) headers[contentType] = o.contentType || defaultHeaders.contentType
    for (h in headers)
      headers.hasOwnProperty(h) && http.setRequestHeader(h, headers[h])
  }

  function setCredentials(http, o) {
    if (typeof o.withCredentials !== 'undefined' && typeof http.withCredentials !== 'undefined') {
      http.withCredentials = !!o.withCredentials
    }
  }

  function generalCallback(data) {
    lastValue = data
  }

  function urlappend (url, s) {
    return url + (/\?/.test(url) ? '&' : '?') + s
  }

  function handleJsonp(o, fn, err, url) {
    var reqId = uniqid++
      , cbkey = o.jsonpCallback || 'callback' // the 'callback' key
      , cbval = o.jsonpCallbackName || reqwest.getcallbackPrefix(reqId)
      // , cbval = o.jsonpCallbackName || ('reqwest_' + reqId) // the 'callback' value
      , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
      , match = url.match(cbreg)
      , script = doc.createElement('script')
      , loaded = 0
      , isIE10 = navigator.userAgent.indexOf('MSIE 10.0') !== -1

    if (match) {
      if (match[3] === '?') {
        url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
      } else {
        cbval = match[3] // provided callback func name
      }
    } else {
      url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
    }

    win[cbval] = generalCallback

    script.type = 'text/javascript'
    script.src = url
    script.async = true
    if (typeof script.onreadystatechange !== 'undefined' && !isIE10) {
      // need this for IE due to out-of-order onreadystatechange(), binding script
      // execution to an event listener gives us control over when the script
      // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
      //
      // if this hack is used in IE10 jsonp callback are never called
      script.event = 'onclick'
      script.htmlFor = script.id = '_reqwest_' + reqId
    }

    script.onload = script.onreadystatechange = function () {
      if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
        return false
      }
      script.onload = script.onreadystatechange = null
      script.onclick && script.onclick()
      // Call the user callback with the last value stored and clean up values and scripts.
      o.success && o.success(lastValue)
      lastValue = undefined
      head.removeChild(script)
      loaded = 1
    }

    // Add the script to the DOM head
    head.appendChild(script)

    // Enable JSONP timeout
    return {
      abort: function () {
        script.onload = script.onreadystatechange = null
        o.error && o.error({}, 'Request is aborted: timeout', {})
        lastValue = undefined
        head.removeChild(script)
        loaded = 1
      }
    }
  }

  function getRequest(fn, err) {
    var o = this.o
      , method = (o.method || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o.url
      // convert non-string objects to query-string form unless o.processData is false
      , data = (o.processData !== false && o.data && typeof o.data !== 'string')
        ? reqwest.toQueryString(o.data)
        : (o.data || null)
      , http

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o.type == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o.type == 'jsonp') return handleJsonp(o, fn, err, url)

    http = xhr()
    http.open(method, url, true)
    setHeaders(http, o)
    setCredentials(http, o)
    http.onreadystatechange = handleReadyState(this, fn, err)
    o.before && o.before(http)
    http.send(data)
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn

    init.apply(this, arguments)
  }

  function setType(url) {
    var m = url.match(/\.(json|jsonp|html|xml)(\?|$)/)
    return m ? m[1] : 'js'
  }

  function init(o, fn) {

    this.url = typeof o == 'string' ? o : o.url
    this.timeout = null

    // whether request has been fulfilled for purpose
    // of tracking the Promises
    this._fulfilled = false
    // success handlers
    this._fulfillmentHandlers = []
    // error handlers
    this._errorHandlers = []
    // complete (both success and fail) handlers
    this._completeHandlers = []
    this._erred = false
    this._responseArgs = {}

    var self = this
      , type = o.type || setType(this.url)

    fn = fn || function () {}

    if (o.timeout) {
      this.timeout = setTimeout(function () {
        self.abort()
      }, o.timeout)
    }

    if (o.success) {
      this._fulfillmentHandlers.push(function () {
        o.success.apply(o, arguments)
      })
    }

    if (o.error) {
      this._errorHandlers.push(function () {
        o.error.apply(o, arguments)
      })
    }

    if (o.complete) {
      this._completeHandlers.push(function () {
        o.complete.apply(o, arguments)
      })
    }

    function complete (resp) {
      o.timeout && clearTimeout(self.timeout)
      self.timeout = null
      while (self._completeHandlers.length > 0) {
        self._completeHandlers.shift()(resp)
      }
    }

    function success (resp) {
      // use global data filter on response text
      var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
        , r = resp.responseText = filteredResponse
      if (r) {
        switch (type) {
        case 'json':
          try {
            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
          } catch (err) {
            return error(resp, 'Could not parse JSON in response', err)
          }
          break
        case 'js':
          resp = eval(r)
          break
        case 'html':
          resp = r
          break
        case 'xml':
          resp = resp.responseXML
              && resp.responseXML.parseError // IE trololo
              && resp.responseXML.parseError.errorCode
              && resp.responseXML.parseError.reason
            ? null
            : resp.responseXML
          break
        }
      }

      self._responseArgs.resp = resp
      self._fulfilled = true
      fn(resp)
      while (self._fulfillmentHandlers.length > 0) {
        self._fulfillmentHandlers.shift()(resp)
      }

      complete(resp)
    }

    function error(resp, msg, t) {
      self._responseArgs.resp = resp
      self._responseArgs.msg = msg
      self._responseArgs.t = t
      self._erred = true
      while (self._errorHandlers.length > 0) {
        self._errorHandlers.shift()(resp, msg, t)
      }
      complete(resp)
    }

    this.request = getRequest.call(this, success, error)
  }

  Reqwest.prototype = {
    abort: function () {
      this._aborted = true
      this.request.abort()
    }

  , retry: function () {
      init.call(this, this.o, this.fn)
    }

    /**
     * Small deviation from the Promises A CommonJs specification
     * http://wiki.commonjs.org/wiki/Promises/A
     */

    /**
     * `then` will execute upon successful requests
     */
  , then: function (success, fail) {
      if (this._fulfilled) {
        success(this._responseArgs.resp)
      } else if (this._erred) {
        fail(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._fulfillmentHandlers.push(success)
        this._errorHandlers.push(fail)
      }
      return this
    }

    /**
     * `always` will execute whether the request succeeds or fails
     */
  , always: function (fn) {
      if (this._fulfilled || this._erred) {
        fn(this._responseArgs.resp)
      } else {
        this._completeHandlers.push(fn)
      }
      return this
    }

    /**
     * `fail` will execute when the request fails
     */
  , fail: function (fn) {
      if (this._erred) {
        fn(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._errorHandlers.push(fn)
      }
      return this
    }
  }

  function reqwest(o, fn) {
    return new Reqwest(o, fn)
  }

  // normalize newline variants according to spec -> CRLF
  function normalize(s) {
    return s ? s.replace(/\r?\n/g, '\r\n') : ''
  }

  function serial(el, cb) {
    var n = el.name
      , t = el.tagName.toLowerCase()
      , optCb = function (o) {
          // IE gives value="" even where there is no value attribute
          // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
          if (o && !o.disabled)
            cb(n, normalize(o.attributes.value && o.attributes.value.specified ? o.value : o.text))
        }
      , ch, ra, val, i

    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) return

    switch (t) {
    case 'input':
      if (!/reset|button|image|file/i.test(el.type)) {
        ch = /checkbox/i.test(el.type)
        ra = /radio/i.test(el.type)
        val = el.value
        // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
        ;(!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
      }
      break
    case 'textarea':
      cb(n, normalize(el.value))
      break
    case 'select':
      if (el.type.toLowerCase() === 'select-one') {
        optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
      } else {
        for (i = 0; el.length && i < el.length; i++) {
          el.options[i].selected && optCb(el.options[i])
        }
      }
      break
    }
  }

  // collect up all form elements found from the passed argument elements all
  // the way down to child elements; pass a '<form>' or form fields.
  // called with 'this'=callback to use for serial() on each element
  function eachFormElement() {
    var cb = this
      , e, i
      , serializeSubtags = function (e, tags) {
          var i, j, fa
          for (i = 0; i < tags.length; i++) {
            fa = e[byTag](tags[i])
            for (j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }

    for (i = 0; i < arguments.length; i++) {
      e = arguments[i]
      if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
      serializeSubtags(e, [ 'input', 'select', 'textarea' ])
    }
  }

  // standard query string style serialization
  function serializeQueryString() {
    return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
  }

  // { 'name': 'value', ... } style serialization
  function serializeHash() {
    var hash = {}
    eachFormElement.apply(function (name, value) {
      if (name in hash) {
        hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
        hash[name].push(value)
      } else hash[name] = value
    }, arguments)
    return hash
  }

  // [ { name: 'name', value: 'value' }, ... ] style serialization
  reqwest.serializeArray = function () {
    var arr = []
    eachFormElement.apply(function (name, value) {
      arr.push({name: name, value: value})
    }, arguments)
    return arr
  }

  reqwest.serialize = function () {
    if (arguments.length === 0) return ''
    var opt, fn
      , args = Array.prototype.slice.call(arguments, 0)

    opt = args.pop()
    opt && opt.nodeType && args.push(opt) && (opt = null)
    opt && (opt = opt.type)

    if (opt == 'map') fn = serializeHash
    else if (opt == 'array') fn = reqwest.serializeArray
    else fn = serializeQueryString

    return fn.apply(null, args)
  }

  reqwest.toQueryString = function (o) {
    var qs = '', i
      , enc = encodeURIComponent
      , push = function (k, v) {
          qs += enc(k) + '=' + enc(v) + '&'
        }
      , k, v

    if (isArray(o)) {
      for (i = 0; o && i < o.length; i++) push(o[i].name, o[i].value)
    } else {
      for (k in o) {
        if (!Object.hasOwnProperty.call(o, k)) continue
        v = o[k]
        if (isArray(v)) {
          for (i = 0; i < v.length; i++) push(k, v[i])
        } else push(k, o[k])
      }
    }

    // spaces should be + according to spec
    return qs.replace(/&$/, '').replace(/%20/g, '+')
  }

  reqwest.getcallbackPrefix = function () {
    return callbackPrefix + parseInt(Math.random() * 10000)
  }

  // jQuery and Zepto compatibility, differences can be remapped here so you can call
  // .ajax.compat(options, callback)
  reqwest.compat = function (o, fn) {
    if (o) {
      o.type && (o.method = o.type) && delete o.type
      o.dataType && (o.type = o.dataType)
      o.jsonpCallback && (o.jsonpCallbackName = o.jsonpCallback) && delete o.jsonpCallback
      o.jsonp && (o.jsonpCallback = o.jsonp)
    }
    return new Reqwest(o, fn)
  }

  reqwest.ajaxSetup = function (options) {
    options = options || {}
    for (var k in options) {
      globalSetupOptions[k] = options[k]
    }
  }

  return reqwest
});
jsql.Events = (function() {

  // Events
  // -----------------
  // Thanks to:
  //  - https://github.com/documentcloud/backbone/blob/master/backbone.js
  //  - https://github.com/joyent/node/blob/master/lib/events.js


  // Regular expression used to split event strings
  var eventSplitter = /\s+/


  // A module that can be mixed in to *any object* in order to provide it
  // with custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = new Events();
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  function Events() {
  }


  // Bind one or more space separated events, `events`, to a `callback`
  // function. Passing `"all"` will bind the callback to all events fired.
  Events.prototype.on = function(events, callback, context) {
    var cache, event, list
    if (!callback) return this

    cache = this.__events || (this.__events = {})
    events = events.split(eventSplitter)

    while (event = events.shift()) {
      list = cache[event] || (cache[event] = [])
      list.push(callback, context)
    }

    return this
  }


  // Remove one or many callbacks. If `context` is null, removes all callbacks
  // with that function. If `callback` is null, removes all callbacks for the
  // event. If `events` is null, removes all bound callbacks for all events.
  Events.prototype.off = function(events, callback, context) {
    var cache, event, list, i

    // No events, or removing *all* events.
    if (!(cache = this.__events)) return this
    if (!(events || callback || context)) {
      delete this.__events
      return this
    }

    events = events ? events.split(eventSplitter) : keys(cache)

    // Loop through the callback list, splicing where appropriate.
    while (event = events.shift()) {
      list = cache[event]
      if (!list) continue

      if (!(callback || context)) {
        delete cache[event]
        continue
      }

      for (i = list.length - 2; i >= 0; i -= 2) {
        if (!(callback && list[i] !== callback ||
            context && list[i + 1] !== context)) {
          list.splice(i, 2)
        }
      }
    }

    return this
  }


  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  Events.prototype.trigger = function(events) {
    var cache, event, all, list, i, len, rest = [], args, returned = {status: true}
    if (!(cache = this.__events)) return this

    events = events.split(eventSplitter)

    // Fill up `rest` with the callback arguments.  Since we're only copying
    // the tail of `arguments`, a loop is much faster than Array#slice.
    for (i = 1, len = arguments.length; i < len; i++) {
      rest[i - 1] = arguments[i]
    }

    // For each event, walk through the list of callbacks twice, first to
    // trigger the event, then to trigger any `"all"` callbacks.
    while (event = events.shift()) {
      // Copy callback lists to prevent modification.
      if (all = cache.all) all = all.slice()
      if (list = cache[event]) list = list.slice()

      // Execute event callbacks.
      callEach(list, rest, this, returned)

      // Execute "all" callbacks.
      callEach(all, [event].concat(rest), this, returned)
    }

    return returned.status
  }


  // Mix `Events` to object instance or Class function.
  Events.mixTo = function(receiver) {
    receiver = receiver.prototype || receiver
    var proto = Events.prototype

    for (var p in proto) {
      if (proto.hasOwnProperty(p)) {
        receiver[p] = proto[p]
      }
    }
  }


  // Helpers
  // -------

  var keys = Object.keys

  if (!keys) {
    keys = function(o) {
      var result = []

      for (var name in o) {
        if (o.hasOwnProperty(name)) {
          result.push(name)
        }
      }
      return result
    }
  }

  // Execute callbacks
  function callEach(list, args, context, returned) {
    var r
    if (list) {
      for (var i = 0, len = list.length; i < len; i += 2) {
        try {
          r = list[i].apply(list[i + 1] || context, args)
        } catch(e) {
          if (window.console && console.error &&
            Object.prototype.toString.call(console.error) === '[object Function]') {
            console.error(e.stack || e)
          }
          // go next with error
          continue
        }

        // trigger will return false if one of the callbacks return false
        r === false && returned.status && (returned.status = false)
      }
    }
  }

  return Events
})();
return jSQL;
});
/* Build Time: September 29, 2013 04:35:23 */
