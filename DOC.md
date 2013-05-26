## jSQL `数据的异想世界`

-------------------------------

### Why Should I Use jSQL?

使用jSQL可以让你更加专注于业务需求和逻辑，通过jSQL可以将排序、筛选等数据查询的底层操作同业务逻辑完美分离。从而提高代码的可维护性和开发效率。jSQL不仅可以用于PC端，也可以在移动手持设备的应用中使用。除了JavaScript版本的jSQL，如果你喜欢jSQL的使用方式和API，同时你又是一个Python后端开发人员且不喜欢庞大的ORM，同样有短小精干的Python-jSQL可以让你在Python框架中方便的对MySQL进行操作。jSQL不是一个库，它是一个使得数据的查询操作变得更方便快捷高效的解决思路和思想、方法的抽象。jSQL内置IO和事件中心，天然的支持远程数据源，并且所有数据的操作行为最终都会通过事件中心广播出去，从而使得数据操作和业务逻辑解耦分离。

### API Document

jSQL是一个用SQL的思想和API实现JavaScript数据操作（查询，过滤）的方法库（同时有基于Tornado DB封装的类似API的后端SQL查询封装），它通过链式调用的方式简化数据查询和操作，同时支持多种形式的数据源。

- `Object`
- `Array`
- `URI`

Object类型：

	{
		key: {column: value},
		key: {column: value}
	}

Object的key对应数据表的唯一索引，cloumn映射为数据表的字段，value对应数据表相应字段的值。

Array类型：

	[
		{column: value},
		{column: value}
	]

Array的每个item对应数据表的一个记录，cloumn对应字段名，value对应字段值，同Object类型不同的是，当前类型的索引key是根据指定的条件或者自动生成的。

`create(dbname, db /*, indexList */)`

`create(dbname, db, /*, scope|function */)`

在内存中创建一个数据库（指定indexList则根据指定字段生成唯一键）
	
	用法示例1:
	
	jsql.create('local', {})

	用法示例2:
	
	jsql.create('local', 'http://uri?callback=?', 'data.result')
	
	用法示例3:
	
	jsql.create('local', 'http://uri', function(resp) {
		return resp.data.result;
	})

`use(dbname)`

使用指定数据库作为当前操作的数据库，并重置缓冲区(buffer)

	local = jsql.use('local').listAll();
	remote = jsql.use('remote').listAll();

`drop(dbname)`

丢弃指定数据库，同时从内存中抹除

	jsql.drop('local');

`dbs()`

获取当前内存中存在的所有数据库名称

	dbs = jsql.dbs(); // ['local', 'remote', 'test']

`db()`

获取当前操作的数据库名称

	cur = jsql.db(); // local

`select(key)`

指定获取的数据字段名称

	local = jsql.use('local').select('*').listAll();
	remote = jsql.use('remote').select('name, age').listAll();

`count()`

获取当前操作缓冲区的数据条数

	count = jsql.use('local').count();

`total(scope|function)`

返回当前操作数据库中含有某字段（或者符合传入条件）的数据总条数。

	total = db.total('data.name');
	total = db.total(function(item) {
		return item.data.age === 24;
	});

`orderby(field, /* callback, */ order)`

根据指定字段的值（或者处理后的值）和排序规则对当前缓冲区的数据进行排序。

	db = jsql.use('local');
	db.select('*').orderby('data.time', buildDate, 'asc');
	result = db.listAll();

`where(fn|[fn, …])`

返回当前缓冲区中符合指定条件的数据集合（如果传入为一组fn，则为并集）。

	db = jsql.use('local');
	db.where([function(item) {
		return item.data.age < 24;
	}, function(item) {
		return item.data.sex === 'male';
	}]);
	result = db.listAll();

`iterate(fn)`

根据指定的方法对当前缓冲区中的数据进行遍历。

	db = jsql.use('local');
	db.where(function(item) {
		return item.data.age < 24;
	}).iterate(function(item) {
		item.data.checked = true;
	});
	result = db.listAll();

`findAll(fn)`

以Object类型返回当前缓冲区中的数据集合

`find(key)`

获取缓冲区中指定key的数据。

`listAll()`

以Array类型返回当前缓冲区中的数据集合。

`update(key, data)`

根据指定数据对指定key的数据进行更新操作。

`insert(item, key /*, from index */)`

（在指定位置）插入一条数据。

`append(/* database, */ data)`

向当前操作的数据库中追加数据。

	jsql.append('local', {});

`delete()`

从当前操作的数据库中删除缓冲区中的数据。

	db = jsql.use('local');
	db.where(function(item) {
		return item.data.age < 24;
	}).delete();

`limit(start, end)`

返回当前缓冲区指定区域的数据（也可以使用`start:end`）。

	db = jsql.use('local');
	db.limit('1:10');
	result = db.listAll();

`keys()`

返回当前缓冲区中所有数据的键名集合。

`first(fn)`

返回满足条件的第一条数据。

`last(fn)`

返回满足条件的最后一条数据。

	db = jsql.use('local');
	db.last(function(item) {
		return item.data.age < 24;
	});
	result = db.find();

`distinct()`

以Array类型返回当前缓冲区中去重后的数组集合。

	db = jsql.use('local');
	result = db.select('airLineCode').distinct(); // ['CA', 'MU', 'CZ']

`rebase()`

重置缓冲区数据。

`noConflict()`

避免命名空间冲突。

	_jSQL = jsql.noConflict();

#### IO

`io`

数据接口异步请求。

- `io.ajax(uri, data, success, error)`
- `io.jsonp(uri, data, success, error)`

	- uri: 请求接口的地址
	- data: 请求接口的附加数据
	- success: 调用成功的回调函数
	- error: 调用出错的回调函数
	
#### Event

jSQL内置的事件中心不仅用于广播/订阅数据库自身的操作，同时它是一个完全独立的事件中心，跟数据无关的操作也可以完全通过它进行广播/订阅，且天然支持广播域，多个域各自拥有不同的事件池，互不干扰。

`on(database, event, callback)`

监听数据库事件。

- database: 被监听的数据库名，取`global`则为全局事件，也可自定义自己的广播域
- event: 被监听的事件名
	- create
	- update
	- drop
	- io:start
	- io:complete
	- io:success
	- io:error
- callback: 事件发生后触发的回调函数

`off(database[, event])`

取消对数据库事件的监听。

`trigger(database, event)`

手动触发指定数据库的指定事件。

举例，两个不同模块之间的广播监听示例：
	
	Module A:
	
	jsql.on('global', 'moduleBChange', function(arg1, arg2) {
		// do something
	});
	
	Module B:
	
	jsql.trigger('global', 'moduleBChange', arg1, arg2);
	
举例，监听某个数据库的创建：

	jsql.on('local', 'create', function() {
		// do something
	});
	
	jsql.create('local', {});

### 闭合操作

所谓闭合操作即执行到此将重置缓冲区，是链式查询的最终状态。

- `count()`
- `find()`
- `findAll()`
- `listAll()`
- `insert()`
- `save()`
- `saveAll()`
- `update()`

除此之外，`use()`也会触发缓冲区重置的操作。