/*
	--------------- jSQL ---------------
	a SQL like database using javascript
	website: http://jsql.injs.org
	licence: MIT Licence
	version: 0.1.0
*/

(function() {
	var _jSQL, jSQL, _DB={};
	
	if(typeof(this.jSQL) !== 'undefined') {
		_jSQL = this.jSQL;
	}
	
	jSQL = function() {
		this._jSQL = _jSQL;
		this._DB = _DB;
		this._currentDB = null;
		this.init.apply(this,arguments);
	};
	
	jSQL.prototype = {
		init: function() {
			
		},
		create: function(dbname, db) {
			if(this._DB[dbname]) {
				throw('DB Already Exist.');
			}
			
			this._DB[dbname] = db;
			return this;
		},
		use: function(dbname) {
			this._currentDB = this._DB[dbname];
			return this;
		},
		count: function() {
			
		},
		orderby: function() {
			
		},
		where: function() {
			
		},
		iterate: function() {
			
		}
	};
	
	typeof(module) !== 'undefined' && module.exports ? module.exports = jSQL : this.jSQL = jSQL;
})();