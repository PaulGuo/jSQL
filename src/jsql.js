/*
    --------------- jSQL ---------------
    a SQL like database using javascript
    website: http://jsql.us
    licence: MIT Licence
    version: @VERSION@-dev
    
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
        version: '@VERSION@-dev',

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
                throw('DB Already Exist.');
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

            console.log('%s: trigger - %s', database, event);
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
