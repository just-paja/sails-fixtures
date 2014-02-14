var
	glob = require('glob'),
	async = require('async'),
	extend = require('node.extend');


var init = function(config, next)
{
	var parallel = [];

	config = extend({
		'dir':__dirname,
		'pattern':'*.json'
	}, config);

	glob(config.dir + "/" + config.pattern, function(next) {
		return function(err, files) {

			for (var ifp = 0; ifp < files.length; ifp++) {
				parallel.push(require(files[ifp]));
			}

			process_all(parallel, next);
		};
	}(next));
};


var process_all = function(queue_list, next)
{
	var jobs = [];

	for (var i = 0; i < queue_list.length; i++) {
		jobs.push(prepare_fixture_job(queue_list[i]));
	}

	async.parallel(jobs, function(next) {
		return function(err, result) {
			if (err) {
				throw err;
			} else {
				next(err);
			}
		};
	}(next));
};


var prepare_fixture_job = function(fixture)
{
	return function(fixture) {
		return function(next) {
			var jobs = [];

			for (var i = 0; i < fixture.length; i++) {
				jobs.push(prepare_model_job(fixture[i]));
			}

			async.series(jobs, next);
		};
	}(fixture);
};


var prepare_model_job = function(model_def)
{
	return function(model_def) {
		return function(next) {
			var
				name  = model_def.model.toLowerCase(),
				items = model_def.items,
				jobs  = [],
				model;

			if (typeof sails.models[name] == 'object') {
				model = sails.models[name];

				for (var i = 0; i < items.length; i++) {
					jobs.push(prepare_model_instance_job(model, items[i]));
				}

				async.series(jobs, next);
			} else {
				next('Model "' + name + '" does not exist');
			}
		};
	}(model_def);
};


var prepare_model_instance_job = function(model, data)
{
	return function(model, data) {
		return function(next) {
			if (typeof data.id == 'number') {
				model.findOne(data.id).done(function(model, data, next) {
					return function(err, obj) {
						if (obj) {
							for (var key in data) {
								obj[key] = data[key];
							}

							obj.save(function(model, data, next) {
								return function(err) {
									next(err, obj);
								};
							}(model, data, next));
						} else {
							model.create(data).done(function(next) {
								return function(err, obj) {
									next(err, obj);
								};
							}(next));
						}
					};
				}(model, data, next));

			} else {
				model.create(data).done(function(next) {
					return function(err, obj) {
						next(err, obj);
					};
				}(next));
			}
		};
	}(model, data);
};


module.exports = {
	'init':init
};
