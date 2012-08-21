/*
    --------------- jSQL ---------------
    a SQL like database using javascript
    website: http://jsql.us
    licence: MIT Licence
    version: 0.2.0 dev
    
    description: using jSQL to process the data easily.
*/

(function() {
    var push             = Array.prototype.push,
        slice            = Array.prototype.slice,
        unshift          = Array.prototype.unshift,
        toString         = Object.prototype.toString,
        hasOwnProperty   = Object.prototype.hasOwnProperty;

    var nativeForEach      = Array.prototype.forEach,
        nativeMap          = Array.prototype.map,
        nativeReduce       = Array.prototype.reduce,
        nativeReduceRight  = Array.prototype.reduceRight,
        nativeFilter       = Array.prototype.filter,
        nativeEvery        = Array.prototype.every,
        nativeSome         = Array.prototype.some,
        nativeIndexOf      = Array.prototype.indexOf,
        nativeLastIndexOf  = Array.prototype.lastIndexOf,
        nativeIsArray      = Array.isArray,
        nativeKeys         = Object.keys,
        nativeBind         = Function.prototype.bind;

    var jSQL, _jSQL, _DB = {};
    var jSQL_KEY_NAME = 'jSQL_Key';
    
    if(typeof(this.jSQL) !== 'undefined') {
        _jSQL = this.jSQL;
    }
    
    jSQL = function() {
        this.init.apply(this,arguments);
    };
    
    jSQL.prototype = {
        init: function() {
            this._jSQL = _jSQL;
            this._DB = _DB;
            this._currentDB = null;
            this._buffer = null;
        },

        /**
        * create a new database
        * @param dbname [String]
        * @param db [Object]
        */

        create: function(dbname, db) {
            var indexList;

            if(this._DB.hasOwnProperty(dbname)) {
                throw('DB Already Exist.');
            }

            if(this._isArray(db)) {
                indexList = this._listSlice(arguments, '2:');
                this._appendKey(db, indexList);
            }

            if(this._isObject(db)) {
                db = this._objectToArray(db);
            }
            
            this._DB[dbname] = db;
            return this;
        },

        /**
        * select an exist database as current
        * @param dbname [String]
        */

        use: function(dbname) {
            if(!this._DB.hasOwnProperty(dbname)) {
                throw('Database Not Exist.');
            }

            this._currentDB = this._DB[dbname];
            this._currentDBName = dbname;
            return this;
        },

        /**
        * drop an exist database
        * @param dbname [String]
        */

        drop: function(dbname) {
            if(this._DB.hasOwnProperty(dbname)) {
                delete this._DB[dbname];
            }
        },

        dbs: function() {
            return this._keys(this._DB);
        },

        db: function() {
            return this._currentDBName;
        },

        /**
        * select object from currentDB
        * @param key
            '*':     return all
            'a':     return base value which key is 'a'
            'a.b.c': return deep value a->b->c
        *
        */

        select: function(key) {
            if(!this._currentDB) {
                throw('Please Select Database First.');
            }
            
            this._buffer = this._currentDB; //reset the _buffer
            
            if(key==='*') {
                return this;
            }
            
            this.where(function(data) {
                return typeof(this._deep(data, key)) !== 'undefined';
            });
            
            return this;
        },

        /**
        * get the count of current result set
        */

        count: function() {
            return this._buffer.length;
        },
        
        /**
        * calculate the total of spec key
        * @param key
            '*':     return first package key count
            'a':     return base value which key is 'a'
            'a.b.c': return deep value a->b->c
        *
        * @use [jSQL instance].total('a.b.c')
        */
        
        total: function(scope) {
            var rs = 0, _tmp;
            
            for(var _key in this._currentDB) {
                if(this._currentDB.hasOwnProperty(_key)) {
                    _tmp = scope === '*' ? 
                        this._currentDB[_key] : 
                        typeof(scope) === 'function' ? 
                            scope.call(this, this._currentDB[_key], _key) === true ? true : undefined : 
                            this._deep(this._currentDB[_key], scope);
                    
                    if(typeof(_tmp) !== 'undefined') {
                        rs++;
                    }
                }
            }
            
            return rs;
        },

        /**
        * sort the current result set
        * @param field [String]
        * @param callback [function]
        * @param order [String <asc | desc>]
        */

        orderby: function(field, callback, order) {
            var _array = this._buffer;
            var _this = this;
            
            if(typeof(callback) !== 'function') {
                callback = [order, order = callback][0];
            }
            
            _array.sort(function(a, b) {
                a = _this._deep(a, field);
                b = _this._deep(b, field);
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
            
            for(var i in this._buffer) {
                if(this._buffer.hasOwnProperty(i)) {
                    if(typeof(fn) === 'function') {
                        _swap = fn.call(this, this._buffer[i], i);
                    }

                    if(this._isArray(fn)) {
                        _swap = false;

                        for(var f in fn) {
                            if(fn.hasOwnProperty(f)) {
                                if(fn[f].call(this, this._buffer[i], i)) {
                                    _swap = true;
                                }
                            }
                        }
                    }
                    
                    if(_swap) {
                        _tmp[i] = this._buffer[i];
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

        /**
        * return the current result set
        * @return [Object]
        */

        findAll: function() {
            return this._clone(this._arrayToObject(this._buffer));
        },

        /**
        * return a specified item of current result set
        * if the key doesn't given, it'll return the first item
        * @return [Object]
        */

        find: function(key) {
            if(!key) {
                for(var i in this._buffer) {
                    if(key) {
                        break;
                    }
                    
                    if(this._buffer.hasOwnProperty(i)) {
                        key = i;
                    }
                }
            }
            
            return this._clone(this._buffer[key]);
        },
        
        /**
        * return the current result set as array list
        * @return [Object]
        */

        listAll: function() {
            return this._clone(this._buffer);
        },
        
        /**
        * update the current result set
        * @param key [String]
        * @param data [Object]
        */
        
        update: function(key, data) {
            if(!this._currentDB) {
                throw('Please Select Database First.');
            }
            
            if(this._currentDB.hasOwnProperty(key)) {
                this._currentDB[key] = data;
            }
        },
        
        /**
        * limit the current result set
        * @param start [Number]
        * @param end [Number]
        */
        
        limit: function(start, end) {
            var _tmp = this._buffer;
            var limit;
            
            if(!end) {
                start = [0, end = start][0];
            }

            limit = start + ':' + (start + end);
            
            this._buffer = this._listSlice(_tmp, limit);
            return this;
        },

        keys: function() {
            return this._keys(this.findAll());
        },

        first: function(fn) {
            if(fn) {
                return this.where(fn).first();
            }

            return this._listSlice(this._buffer, ':1');
        },

        last: function(fn) {
            if(fn) {
                return this.where(fn).last();
            }

            return this._listSlice(this._buffer, '-1:');
        },

        /**
        * private methods
        */
        
        _deep: function(data, scope) {
            var _tmp = data, scope = scope.split('.');
            for(var i = 0; i < scope.length; i++) {
                _tmp = _tmp[scope[i]];
            }
            return _tmp;
        },

        _isArray: nativeIsArray || function(obj) {
            return toString.call(obj) === '[object Array]';
        },

        _isObject: function(obj) {
            return obj === Object(obj);
        },

        _clone: function (obj) {
            if(obj == null || typeof(obj) != 'object') {
                return obj;
            }

            var temp = new obj.constructor();
            for(var key in obj) {
                temp[key] = arguments.callee(obj[key]);
            }

            return temp;
        },

        _objectToArray: function(object) {
            var array = [], object = this._clone(object);
            
            for(var i in object) {
                if(object.hasOwnProperty(i)) {
                    object[i][jSQL_KEY_NAME] = i;
                    array.push(object[i]);
                }
            }
            
            return array;
        },

        _arrayToObject: function(array, key) {
            var object = {};
            
            for(var i = 0; i < array.length; i++) {
                object[array[i][key || jSQL_KEY_NAME]] = array[i];
                delete object[array[i][key || jSQL_KEY_NAME]][key || jSQL_KEY_NAME];
            };
            
            return object;
        },

        _each: function(list, fn) {
            if(nativeForEach) {
                list.forEach(fn);
                return;
            }

            for(var i = 0; i < list.length; i++) {
                fn(list[i], i, list);
            }
        },

        _keygen: function(object, indexList) {
            var that = this;
            var baseRef = [].slice.call(arguments, 1);
            var key = '';

            if(that._isArray(indexList)) {
                baseRef = indexList;
            }

            that._each(baseRef, function(o, i, r) {
                key += object[o];
            });

            return key;
        },

        _listSlice: function(list, range) {
            var start, end;

            list = [].slice.call(list);
            range = range.split(':');
            start = range[0] || 0;
            end = range.length > 1 ? range[1] || list.length : list.length;
            return [].slice.call(list, start, end);
        },

        _appendKey: function(list, indexList) {
            var that = this;
            that._each(list, function(o, i, r) {
                o['jSQL_Key'] = that._keygen(o, indexList);
            });
        },

        _keys: nativeKeys || (function() {
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
        })()
    };

    jSQL = new jSQL();
    
    typeof(module) !== 'undefined' && module.exports ? module.exports = jSQL : this.jSQL = jSQL;
})();
