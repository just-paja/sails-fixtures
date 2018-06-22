// Required to simplify file reading with patterns
const glob = require("glob");
// Required for entire lib
const async = require("async");
// Required just for config default values
const extend = require("node.extend");
// Required to work with paths
const path = require("path");

/**
 * Loads data into db
 *
 * @param object   data   json data to load into db
 * @param function next   Callback after all jobs are finished or some fail. First argument is error. `next(err)`. Second is rows created
 */
const load = function(data, next) {
  if (!data || typeof data != "object") {
    next(new Error("Missing data parameter"));
  } else {
    prepare_fixture_job(data)(next);
  }
};

/**
 * Clear existing data
 *
 * @param object   collections   clear the collections from data
 * @param function next   Callback after all jobs are finished or some fail. First argument is error. `next(err)`.
 */
const clear = function(collections, next) {
  if (!collections) {
    next(new Error("Missing collections parameter"));
  } else {
    collections = typeof collections == "object" ? collections : [collections];
    async.parallel(
      collections.map(function(collection) {
        return clearCollection(collection);
      }),
      next
    );
  }
};

/**
 * Finds all fixtures in config.dir and loads
 * them into db using waterline models
 *
 * @param object   config Configuration for init
 * @param function next   Callback after all jobs are finished or some fail. First argument is error. `next(err)`. Second is number of files loaded
 */
const loadFromFiles = function(config, next) {
  const jobs = [];

  // Extend default config by users' wishes
  config = extend(
    {
      dir: __dirname,
      pattern: "*.json"
    },
    config
  );

  let loadedFiles;

  // Find all fixture files
  jobs.push(function(next) {
    glob(path.join(config.dir, config.pattern), next);
  });

  // Read all JSON fixtures and load them
  jobs.push(function(files, next) {
    const parallel = [];
    loadedFiles = files.length;

    //  Read JSON fixtures
    for (let ifp = 0; ifp < files.length; ifp++) {
      const p = path.resolve(files[ifp]);
      parallel.push(require(p));
    }

    // Load them
    process_all(parallel, next);
  });

  /*
	 * Do the job and fire bootstrap callback. Catch any async errors and throw
	 * them to the user
	 */
  async.waterfall(jobs, function(err) {
    if (err) next(err);
    else next(null, loadedFiles);
  });
};

/**
 * Load all data fixtures on the list in parallel
 *
 * @param array    queue_list List of all fixtures with data
 * @param function next       Standart async callback that id passed an error as first argument. `next(err)`
 */
var process_all = function(queue_list, next) {
  const jobs = [];

  for (let i = 0; i < queue_list.length; i++) {
    jobs.push(prepare_fixture_job(queue_list[i]));
  }

  async.parallel(jobs, next);
};

/**
 * Create fixture job for async that loads all model data of a fixture into db.
 *
 * @param array fixture Array/list of models to load
 * @return function(next) Where next is a callback to be passed
 */
var prepare_fixture_job = function(fixture) {
  return (function(fixture) {
    return function(next) {
      const jobs = [];

      for (let i = 0; i < fixture.length; i++) {
        jobs.push(prepare_model_job(fixture[i]));
      }

      async.series(jobs, next);
    };
  })(fixture);
};

/**
 * Create model job for async that loads data/rows of a model into db.
 *
 * @param object model_def Plain object containing model name and items data
 * @return function(next) Where next is a callback to be passed
 *
 */
var prepare_model_job = function(model_def) {
  return (function(model_def) {
    return function(next) {
      const name = model_def.model.toLowerCase();
      const items = model_def.items;
      const jobs = [];

      if (typeof sails.models[name] == "object") {
        const model = sails.models[name];

        for (var i = 0; i < items.length; i++) {
          jobs.push(prepare_model_instance_job(model, items[i]));
        }

        async.series(jobs, next);
      } else {
        next('Model "' + name + '" does not exist');
      }
    };
  })(model_def);
};

/**
 * Create model instance job for async that runs for individual data rows. If id
 * is passed, check db for existence and update/create record. If not, data is
 * simply created.
 *
 * @param object model Sails model (static)
 * @param object data  Plain object containing instance attr data
 * @return function(next) Where next is a callback to be passed
 */
var prepare_model_instance_job = function(model, data) {
  return (function(model, data) {
    return function(next) {
      if (data.id) {
        model.findOne(data.id).exec(
          (function(model, data, next) {
            return function(err, obj) {
              if (obj) {
                model.update({ id: obj.id }, data).exec(function() {
                  next(err);
                });
              } else {
                model.create(data).exec(
                  (function(next) {
                    return function(err, obj) {
                      next(err, obj);
                    };
                  })(next)
                );
              }
            };
          })(model, data, next)
        );
      } else {
        model.create(data).exec(
          (function(next) {
            return function(err, obj) {
              next(err, obj);
            };
          })(next)
        );
      }
    };
  })(model, data);
};

const clearCollection = function(collection) {
  return function(next) {
    if (typeof sails.models[collection] != "object") {
      next(new Error("invalid collection " + collection));
    } else {
      sails.models[collection].destroy().exec(next);
    }
  };
};

// Export only init, nothing else could ever be needed
module.exports = {
  loadFromFiles: loadFromFiles,
  load: load,
  clear: clear,
  init: loadFromFiles
};
