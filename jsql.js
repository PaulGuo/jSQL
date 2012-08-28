/*
    --------------- jSQL ---------------
    a SQL like database using javascript
    website: http://jsql.us
    licence: MIT Licence
    version: 0.3.0 dev
    
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
    var jSQL, _jSQL, _jsql, _DB = {}, _DBIndexMap = {}, _protected = {};
    
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
        version: '0.3.0-dev',

        init: function() {
            this._jSQL = _jSQL;
            this._jsql = _jsql;
            this._DB = _DB;
            this._currentDB = null;
            this._buffer = null;
            this._DBIndexMap = _DBIndexMap;
            this._protected = _protected;
            this.utils = utils;
        },

        create: function(dbname, db) {
            var indexList;

            if(this._DB.hasOwnProperty(dbname)) {
                throw('DB Already Exist.');
            }

            if(utils.isArray(db)) {
                indexList = utils.listSlice(arguments, '2:');
                utils.appendKey(db, indexList);
                _DBIndexMap[dbname] = utils.arrayToObject(db);
            }

            if(utils.isPlainObject(db)) {
                _DBIndexMap[dbname] = utils.clone(db);
                db = utils.objectToArray(db);
            }
            
            this._DB[dbname] = db;
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
            }
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
            
            this._buffer = this._currentDB; //reset the _buffer
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
                        _tmp.push(utils.clone(this._buffer[i]));
                    }
                }
            }
            this._buffer = _tmp;
            return this;
        },

        iterate: function(fn) {
            var _swap;
            this._buffer = this._buffer || this._currentDB;
            
            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    _swap = fn.call(this, this._buffer[i]);
                    
                    if(_swap) {
                        this.update(i, _swap);
                    }
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
        
        update: function(key, data) {
            if(!this._currentDB) {
                throw('Please Select Database First.');
            }
            
            if(this._currentDB.hasOwnProperty(key)) {
                this._currentDB[key] = data;
            }
        },

        insert: function() {
            //TODO
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

        rebase: function() {
            this._protected = {};
            this.select('*');
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

        _select: function(field) {
            var tmp, result = [];

            field = field || this._protected['field'];

            if(field === '*' || (field.join && field.join('') === '*')) {
                return this._buffer;
            }

            if(typeof(field) === 'string') {
                field = field.split(',');
            }

            utils.each(this._buffer, function(o, i, r) {
                tmp = {};
                tmp[jSQL_KEY_NAME] = utils.deep(o, jSQL_KEY_NAME);

                utils.each(field, function(_o, _i, _r) {
                    if(o.hasOwnProperty(_o)) {
                        tmp[_o.split('.').pop()] = utils.deep(o, _o);
                    }
                });
                result.push(tmp);
            });

            return result;
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
        }
    };

    jSQL = new jSQL();
    
    typeof(module) !== 'undefined' && module.exports ? module.exports = jSQL : this.jsql = this.jSQL = jSQL;
})();
